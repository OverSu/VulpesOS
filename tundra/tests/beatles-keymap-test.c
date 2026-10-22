/* SPDX-License-Identifier: MPL-2.0 */
#include <assert.h>
#define main keypad_reader_main
#include "../probes/beatles-keypad.c"
#undef main

int main(void) {
  for(unsigned code=KEY_1;code<=KEY_0;code++)assert(symbol(code)!=NoSymbol);
  const unsigned controls[]={KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT,KEY_OK,
    KEY_BACK,KEY_BACKSPACE,KEY_MENU,KEY_SEND,KEY_POWER,KEY_CAMERA,
    KEY_NUMERIC_STAR,KEY_NUMERIC_POUND,KEY_VOLUMEUP,KEY_VOLUMEDOWN};
  for(unsigned i=0;i<sizeof(controls)/sizeof(controls[0]);i++)
    assert(symbol(controls[i])!=NoSymbol);
  assert(native_code("Notifications")==KEY_CAMERA);
  assert(symbol(KEY_CAMERA)==XK_F2);
  /* Do not give the assistance key an accidental call/emergency action. */
  assert(symbol(112)==NoSymbol);
  assert(!allow_key(KEY_SEND,1,1));
  assert(!allow_key(KEY_2,1,1));
  assert(allow_key(KEY_SEND,0,1));
  assert(allow_key(KEY_VOLUMEUP,1,1));
  assert(allow_key(KEY_VOLUMEDOWN,1,1));
  assert(allow_key(KEY_2,1,0));
  puts("Nokia key map and closed-lid input policy: OK");
  return 0;
}
