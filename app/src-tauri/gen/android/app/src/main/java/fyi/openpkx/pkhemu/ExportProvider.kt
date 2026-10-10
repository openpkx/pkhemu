package fyi.openpkx.pkhemu

import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.provider.MediaStore
import androidx.core.content.FileProvider

// tauri-plugin-android-fs reads a shared file's mime_type column, which FileProvider doesn't serve.
class ExportProvider : FileProvider(R.xml.exports) {
  override fun query(
    uri: Uri,
    projection: Array<String>?,
    selection: String?,
    selectionArgs: Array<String>?,
    sortOrder: String?,
  ): Cursor {
    val cursor = super.query(uri, projection, selection, selectionArgs, sortOrder)
    if (projection?.contains(MediaStore.MediaColumns.MIME_TYPE) != true) return cursor
    return cursor.use {
      MatrixCursor(projection, 1).apply {
        if (it.moveToFirst()) {
          addRow(projection.map { column ->
            when (val index = it.getColumnIndex(column)) {
              -1 -> if (column == MediaStore.MediaColumns.MIME_TYPE) getType(uri) else null
              else -> it.getString(index)
            }
          })
        }
      }
    }
  }
}
