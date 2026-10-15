#include <libretro.h>
#include <streams/file_stream.h>
#include "common/file_util.h"
#include "common/logging/log.h"

// The library leaves out Azahar's logging backend, which would pull in the rest of Azahar.
namespace Common::Log {
void FmtLogMessageImpl(Class, Level, const char*, unsigned int, const char*, fmt::string_view,
                       const fmt::format_args&) {}
void Stop() {}
} // namespace Common::Log

extern "C" std::size_t azahar_write_u64(const retro_vfs_interface_info* vfs, const char* path, u64 value) {
    filestream_vfs_init(vfs);
    return FileUtil::IOFile(path, "wb").WriteObject(value);
}

extern "C" std::size_t azahar_read_u64(const retro_vfs_interface_info* vfs, const char* path, u64* value) {
    filestream_vfs_init(vfs);
    return FileUtil::IOFile(path, "rb").ReadArray(value, 1);
}
