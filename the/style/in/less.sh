#!/bin/bash

FILE="style.less"
LAST=""

while true; do
    NEW=$(stat -f %m "$FILE")
    if [ "$NEW" != "$LAST" ]; then
        LAST=$NEW
        echo "RUNNING lessc style.less style.css"
        lessc style.less style.css
        echo "waiting for change…"
    fi
    sleep 1
done
