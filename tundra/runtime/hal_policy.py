# SPDX-License-Identifier: MPL-2.0
"""Reduce Android init to display HAL services for the read-only Sargo trial.

Input files retain their upstream copyright notices. Removed commands and services
are reported; this is not a general Android init parser or a production policy.
"""
import shlex

SERVICES = frozenset(('ueventd','logd','servicemanager','hwservicemanager','vndservicemanager',
    'vendor.hwcomposer-2-2','vendor.qti.hardware.display.allocator','vendor.configstore-hal',
    'vendor.power-hal-1-3','vendor.thermal-engine','thermal-hal-1-1','hidl_memory'))
COMMANDS = frozenset(('mkdir','chmod','chown','write','setprop','symlink','copy',
    'restorecon','restorecon_recursive','trigger','class_start','class_stop',
    'load_system_props','load_persist_props','export','setrlimit','hostname','domainname','loglevel','sysclktz','start','stop','restart'))
PSEUDO_FS = frozenset(('cgroup','cgroup2','cpuset','tmpfs','proc','sysfs','debugfs','pstore','bpf'))

# The native network trial supplies rmt_storage with RAM copies of NV files.
# It retains the blanket denial of block-device access for this container.
NETWORK_SERVICES = frozenset(('irsc_util', 'vendor.per_mgr', 'vendor.rmt_storage',
                              'vendor.tftp_server', 'cnss-daemon', 'pd_mapper'))


HARDWARE_SERVICES = frozenset(('vendor.qcrild', 'vendor.google.radioext@1.0',
                               'vendor.audio-hal-2-0', 'vendor.camera-provider-2-4',
                               'camera_service', 'minimedia', 'minisf', 'miniaf'))

def is_init_script(path):
    # ueventd uses a different grammar: these files define device permissions.
    return not path.name.startswith('ueventd')


def command_allowed(tokens):
    if not tokens:
        return True
    op=tokens[0]
    if op=='onrestart':
        return command_allowed(tokens[1:])
    if op in ('start','stop','restart'):
        return len(tokens)==2 and tokens[1] in SERVICES
    if op=='mount':
        return len(tokens)>3 and tokens[1] in PSEUDO_FS and not tokens[2].startswith('/dev/')
    if op not in COMMANDS:
        return False
    if any('/dev/block' in t or '/dev/mmcblk' in t or '/sys/kernel/config' in t or '/sys/class/android_usb' in t or '/config/usb_gadget' in t or '/proc/sys/kernel/panic' in t or '/proc/sysrq-trigger' in t for t in tokens[1:]):
        return False
    if op=='setprop' and len(tokens)>2 and tokens[1].startswith('ctl.'):
        return tokens[1] in ('ctl.start','ctl.stop','ctl.restart') and tokens[2] in SERVICES
    return True


def logical_lines(text):
    pending = ''
    first = 1
    for number, line in enumerate(text.splitlines(), 1):
        if not pending: first = number
        pending += line
        if pending.endswith('\\'):
            pending = pending[:-1]+' '
            continue
        try:
            shlex.split(pending.strip(), comments=True)
        except ValueError:
            pending += '\n'
            continue
        yield first, pending
        pending = ''
    if pending:
        raise ValueError('Unterminated Android init command at line '+str(first))


def filter_rc(text):
    output=[];removed=[];kept=[];section=None;keep=True
    for number,line in logical_lines(text):
        stripped=line.strip()
        if not stripped or stripped.startswith('#'):
            if keep:output.append(line)
            continue
        tokens=shlex.split(stripped,comments=True)
        if not line[0].isspace():
            section=tokens[0];keep=True
            if section=='service':
                keep=len(tokens)>2 and tokens[1] in SERVICES and not any('_DISABLED' in t for t in tokens[2:])
                if keep:kept.append(tokens[1])
            elif section=='import':
                # USB, recovery, and Android app processes are outside this trial.
                keep=not any(word in stripped for word in ('usb','recovery','zygote'))
            elif section!='on':
                keep=False
            if keep:output.append(line)
            else:removed.append({'line':number,'text':line})
            continue
        accepted=keep and (section=='service' or command_allowed(tokens))
        # Keep failed trial services inspectable instead of rebooting the device.
        if section=='service' and tokens[0]=='critical':accepted=False
        if section=='service' and tokens[0]=='onrestart':accepted=keep and command_allowed(tokens)
        if accepted:output.append(line)
        else:removed.append({'line':number,'text':line})
    return '\n'.join(output)+'\n',{'services':kept,'removed':removed}
