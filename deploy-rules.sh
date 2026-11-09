#!/bin/bash
# מעדכן את כללי האבטחה של Firestore מהקובץ firestore.rules שבמאגר.
# מריצים ב-Google Cloud Shell (מחובר אוטומטית לחשבון Google שלכם):
#   curl -sL https://raw.githubusercontent.com/fox8682/family-app/main/deploy-rules.sh | bash
set -e
P="${1:-rsg1-d3783}"
API="https://firebaserules.googleapis.com/v1/projects/$P"
echo "⏳ מעדכן את כללי האבטחה בפרויקט $P ..."
T=$(gcloud auth print-access-token)
H=(-H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "x-goog-user-project: $P")
curl -sfL https://raw.githubusercontent.com/fox8682/family-app/main/firestore.rules -o /tmp/firestore.rules
python3 -c "import json;print(json.dumps({'source':{'files':[{'name':'firestore.rules','content':open('/tmp/firestore.rules').read()}]}}))" > /tmp/ruleset.json
RES=$(curl -s -X POST "${H[@]}" -d @/tmp/ruleset.json "$API/rulesets")
RS=$(echo "$RES" | python3 -c "import sys,json;print(json.load(sys.stdin).get('name',''))")
if [ -z "$RS" ]; then echo "❌ הכללים לא נשמרו:"; echo "$RES"; exit 1; fi
REL="projects/$P/releases/cloud.firestore"
OUT=$(curl -s -o /tmp/rel.out -w "%{http_code}" -X PATCH "${H[@]}" -d "{\"release\":{\"name\":\"$REL\",\"rulesetName\":\"$RS\"}}" "$API/releases/cloud.firestore")
if [ "$OUT" = "404" ]; then
  OUT=$(curl -s -o /tmp/rel.out -w "%{http_code}" -X POST "${H[@]}" -d "{\"name\":\"$REL\",\"rulesetName\":\"$RS\"}" "$API/releases")
fi
if [ "$OUT" = "200" ]; then echo "✅ הכללים עודכנו! אפשר לחזור ל-Claude ולכתוב: סיימתי"; else echo "❌ שגיאה ($OUT):"; cat /tmp/rel.out; exit 1; fi
