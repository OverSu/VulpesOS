#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Inspect a running native RAM trial. Execute inside its main root as root."""
import json
import os
from pathlib import Path
import subprocess
import time


def inspect():
    if 'tundra.rescue=1' not in Path('/proc/cmdline').read_text():
        raise RuntimeError('This inspector is for a native RAM trial')
    result={'recordedAtUnix':time.time(),'uptime':Path('/proc/uptime').read_text().strip()}
    commands={
        'failedUnits':['systemctl','--failed','--no-legend','--no-pager'],
        'activeUnits':['systemctl','is-active','tundra-hal','tundra-display','systemd-logind','user@32011'],
        'displayRestarts':['systemctl','show','tundra-display','-p','NRestarts','--value'],
        'kernel':['uname','-r'],
        'halPid':['lxc-info','-n','tundra-hal','-pH'],
    }
    for name,command in commands.items():
        process=subprocess.run(command,capture_output=True,text=True,timeout=10)
        result[name]={'code':process.returncode,'stdout':process.stdout,'stderr':process.stderr}
    kernel = subprocess.run(['dmesg'], capture_output=True, text=True, timeout=10)
    result['kernelFaults'] = [line for line in kernel.stdout.splitlines()
                              if any(marker in line for marker in
                                     ('Internal error: Oops', 'Kernel panic', 'Kernel BUG', 'BUG:'))]
    result['memoryKills'] = [line for line in kernel.stdout.splitlines()
                             if any(marker in line for marker in
                                    ('lowmemorykiller: Killing', 'Out of memory: Kill', 'oom-kill:', 'Killed process'))]
    result['kernelLogReadable'] = kernel.returncode == 0
    result['pid1']=Path('/proc/1/cmdline').read_text().replace('\0',' ')
    result['identity']=Path('/etc/os-release').read_text()
    result['mounts']=Path('/proc/1/mounts').read_text()
    result['memory']=Path('/proc/meminfo').read_text()
    pid=result['halPid']['stdout'].strip()
    result['halCgroups']=Path('/proc',pid,'cgroup').read_text() if pid.isdigit() else None
    result['halMemoryLimits']={str(p):p.read_text().strip() for p in Path('/sys/fs/cgroup').rglob('memory.max') if 'lxc.payload.tundra-hal' in str(p)}
    result['gaia']=json.loads(Path('/opt/vulpes/logs/test.json').read_text())
    processes=[]
    for path in Path('/proc').glob('[0-9]*/cmdline'):
        try:
            command=path.read_text().replace('\0',' ').strip()
            if not command:continue
            status=dict(line.split(':',1) for line in (path.parent/'status').read_text().splitlines() if ':' in line)
            processes.append({'pid':int(path.parent.name),'command':command,
                              'uid':status.get('Uid','').strip(),'seccomp':status.get('Seccomp','').strip(),
                              'capabilities':status.get('CapEff','').strip()})
        except (OSError,ProcessLookupError):continue
    result['processes']=processes
    result['checks']={
        'noKernelFaults':result['kernelLogReadable'] and not result['kernelFaults'],
        'noMemoryKills':result['kernelLogReadable'] and not result['memoryKills'],
        'tundraPid1':'--unit=tundra.target' in result['pid1'],
        'noFailedUnits':result['failedUnits']['code']==0 and not result['failedUnits']['stdout'].strip(),
        'servicesActive':result['activeUnits']['code']==0 and result['activeUnits']['stdout'].split()==['active']*4,
        'noDisplayRestart':result['displayRestarts']['stdout'].strip()=='0',
        'gaia':result['gaia']['passed'],
        'halLegacyDeviceGuard':bool(result['halCgroups'] and ':devices:/hal' in result['halCgroups']),
        'halMemoryBounded':'536870912' in result['halMemoryLimits'].values(),
        'noAndroidAppRuntime':not any(p['command'].split()[0].rsplit('/',1)[-1] in ('zygote','zygote64','app_process','app_process64','phosh') for p in processes),
    }
    return result


if __name__=='__main__':
    result=inspect()
    print(json.dumps(result,indent=2))
    raise SystemExit(0 if all(result['checks'].values()) else 1)
