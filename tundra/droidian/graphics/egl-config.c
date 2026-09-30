/* SPDX-License-Identifier: MPL-2.0
 * Local GLVND adapter for Droidian libhybris b22d041 (Wayland only).
 * That revision passes its wrapper EGLDisplay to Android eglGetConfigAttrib.
 * All other entry points retain the vendor's implementation. The launcher
 * must verify the exact vendor library hash before enabling this adapter.
 */
#define EGL_NO_X11
#include <glvnd/libeglabi.h>
extern void *dlopen(const char *, int);
extern void *dlsym(void *, const char *);
extern int strcmp(const char *, const char *);
static void *(*vendor_proc)(const char *);
static EGLBoolean (*vendor_config)(EGLDisplay, EGLConfig, EGLint, EGLint *);

static EGLBoolean config_attrib(EGLDisplay display, EGLConfig config,
                                EGLint attribute, EGLint *value) {
    /* ws.h at b22d041: _EGLDisplay begins with the Android EGLDisplay dpy.
     * GLVND has already checked that this display belongs to this vendor.
     */
    EGLDisplay android_display = *(EGLDisplay *)display;
    return vendor_config(android_display, config, attribute, value);
}
static void *get_proc(const char *name) {
    if (!strcmp(name, "eglGetConfigAttrib")) return (void *)config_attrib;
    return vendor_proc(name);
}
EGLBoolean __egl_Main(uint32_t version, const __EGLapiExports *exports,
                      __EGLvendorInfo *vendor, __EGLapiImports *imports) {
    void *library = dlopen("libEGL_libhybris.so.0", 2);
    if (!library) return EGL_FALSE;
    EGLBoolean (*entry)(uint32_t, const __EGLapiExports *, __EGLvendorInfo *,
                         __EGLapiImports *) = dlsym(library, "__egl_Main");
    if (!entry || !entry(version, exports, vendor, imports)) return EGL_FALSE;
    vendor_proc = imports->getProcAddress;
    vendor_config = vendor_proc("eglGetConfigAttrib");
    if (!vendor_config) return EGL_FALSE;
    imports->getProcAddress = get_proc;
    return EGL_TRUE;
}
