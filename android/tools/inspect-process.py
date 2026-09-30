import sys
import json
from rdp import RDP

r = RDP()
targets = r.call("root", "listProcesses")["processes"]
for p in targets:
    if p["isParent"]:
        continue
    t = r.call(p["actor"], "getTarget")["process"]
    if sys.argv[1] not in t.get("remoteType", ""):
        continue
    a = r.call(t["consoleActor"], "evaluateJSAsync", text=sys.argv[2])
    while True:
        q = r.recv()
        if q.get("type") == "evaluationResult":
            print(json.dumps(q, indent=2))
            break
r.s.close()
