package com.pixomobile

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import android.util.Log
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.*
import java.util.UUID

class PixoMediaScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var directoryPickerPromise: Promise? = null
    private val DIRECTORY_PICKER_REQUEST_CODE = 1001

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "PixoMediaScanner"
    }

    @ReactMethod
    fun scanMediaStore(type: String, promise: Promise) {
        try {
            val fileList = Arguments.createArray()
            val uri: Uri
            val projection = arrayOf(
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.MIME_TYPE,
                MediaStore.MediaColumns.SIZE,
                MediaStore.MediaColumns.DATE_MODIFIED
            )

            val hasImagePerm = ContextCompat.checkSelfPermission(reactApplicationContext, if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
            val hasVideoPerm = ContextCompat.checkSelfPermission(reactApplicationContext, if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_VIDEO else Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
            
            Log.d("PixoMediaScanner", "Media permission granted: ${hasImagePerm || hasVideoPerm}")
            Log.d("PixoMediaScanner", "Android SDK version: ${Build.VERSION.SDK_INT}")
            Log.d("PixoMediaScanner", "Selected categories: $type")

            if (type == "photos") {
                uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                Log.d("PixoMediaScanner", "Querying MediaStore Images")
            } else if (type == "videos") {
                uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                Log.d("PixoMediaScanner", "Querying MediaStore Videos")
            } else {
                promise.reject("INVALID_TYPE", "Type must be photos or videos")
                return
            }

            val cursor = reactApplicationContext.contentResolver.query(
                uri, projection, null, null, "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"
            )

            var isFirst = true
            var count = 0

            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
                val nameColumn = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
                val mimeTypeColumn = it.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE)
                val sizeColumn = it.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
                val dateModifiedColumn = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
                
                count = it.count
                if (type == "photos") {
                    Log.d("PixoMediaScanner", "Images cursor count: $count")
                } else {
                    Log.d("PixoMediaScanner", "Videos cursor count: $count")
                }

                while (it.moveToNext()) {
                    val id = it.getLong(idColumn)
                    val contentUri = Uri.withAppendedPath(uri, id.toString()).toString()
                    val name = it.getString(nameColumn) ?: "unnamed"
                    
                    if (isFirst) {
                        Log.d("PixoMediaScanner", "First file name: $name")
                        isFirst = false
                    }

                    val mimeType = it.getString(mimeTypeColumn) ?: "application/octet-stream"
                    val size = it.getLong(sizeColumn)
                    val dateModified = it.getLong(dateModifiedColumn) * 1000 // Convert to ms

                    val fileMap = Arguments.createMap()
                    fileMap.putString("fileToken", UUID.randomUUID().toString())
                    fileMap.putString("uri", contentUri)
                    fileMap.putString("fileName", name)
                    fileMap.putString("mimeType", mimeType)
                    fileMap.putDouble("fileSize", size.toDouble())
                    fileMap.putString("category", type)
                    fileMap.putDouble("modifiedAt", dateModified.toDouble())

                    fileList.pushMap(fileMap)
                }
            }
            Log.d("PixoMediaScanner", "Total indexed files: $count")
            promise.resolve(fileList)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestDirectoryAccess(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist")
            return
        }
        directoryPickerPromise = promise
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            activity.startActivityForResult(intent, DIRECTORY_PICKER_REQUEST_CODE)
        } catch (e: Exception) {
            directoryPickerPromise?.reject("INTENT_FAILED", e.message)
            directoryPickerPromise = null
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == DIRECTORY_PICKER_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val uri = data.data
                if (uri != null) {
                    try {
                        val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        reactApplicationContext.contentResolver.takePersistableUriPermission(uri, takeFlags)
                        directoryPickerPromise?.resolve(uri.toString())
                    } catch (e: Exception) {
                        directoryPickerPromise?.reject("PERMISSION_DENIED", e.message)
                    }
                } else {
                    directoryPickerPromise?.reject("NO_URI", "No directory selected")
                }
            } else {
                directoryPickerPromise?.reject("USER_CANCELLED", "User cancelled directory picker")
            }
            directoryPickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {}

    @ReactMethod
    fun scanDirectory(treeUriString: String, category: String, promise: Promise) {
        try {
            val treeUri = Uri.parse(treeUriString)
            val rootFile = DocumentFile.fromTreeUri(reactApplicationContext, treeUri)
            val fileList = Arguments.createArray()

            if (rootFile != null && rootFile.isDirectory) {
                scanDocumentFileRecursive(rootFile, fileList, category)
            } else {
                promise.reject("INVALID_DIRECTORY", "Could not read directory")
                return
            }

            promise.resolve(fileList)
        } catch (e: Exception) {
            promise.reject("SCAN_DIRECTORY_ERROR", e.message)
        }
    }

    private fun scanDocumentFileRecursive(dir: DocumentFile, fileList: WritableArray, category: String) {
        val files = dir.listFiles()
        for (file in files) {
            if (file.isDirectory) {
                // Recursively scan, but limit depth to avoid excessive scanning overhead if needed
                // For MVP, standard recursive is fine
                scanDocumentFileRecursive(file, fileList, category)
            } else {
                val name = file.name ?: "unnamed"
                val mimeType = file.type ?: getMimeTypeFromExtension(name)
                val size = file.length()
                val dateModified = file.lastModified()

                // Basic filtering: limit WhatsApp to media, skip sqlite databases, etc.
                if (name.endsWith(".db") || name.endsWith(".sqlite") || name.endsWith(".crypt14")) continue

                val fileMap = Arguments.createMap()
                fileMap.putString("fileToken", UUID.randomUUID().toString())
                fileMap.putString("uri", file.uri.toString())
                fileMap.putString("fileName", name)
                fileMap.putString("mimeType", mimeType)
                fileMap.putDouble("fileSize", size.toDouble())
                fileMap.putString("category", category)
                fileMap.putDouble("modifiedAt", dateModified.toDouble())

                fileList.pushMap(fileMap)
            }
        }
    }

    private fun getMimeTypeFromExtension(name: String): String {
        val extension = MimeTypeMap.getFileExtensionFromUrl(name)
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.lowercase()) ?: "application/octet-stream"
    }
}
