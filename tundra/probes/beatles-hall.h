/* SPDX-License-Identifier: MPL-2.0 */
#ifndef VULPES_BEATLES_HALL_H
#define VULPES_BEATLES_HALL_H
/* Nokia hall_status reports the magnet: 1 = closed, 0 = open.
 * Keep this conversion shared by panel power and keypad handling. */
static inline int beatles_hall_open(int raw) {
  return raw == 0 ? 1 : raw == 1 ? 0 : -1;
}
#endif
