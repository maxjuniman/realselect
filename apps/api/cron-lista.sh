#!/bin/sh
cd /app/apps/api || exit 1
/usr/local/bin/node dist/send-lista.js >> /var/log/realselect-lista.log 2>&1
status=$?
if [ -e /proc/1/fd/1 ]; then
  tail -n 5 /var/log/realselect-lista.log > /proc/1/fd/1 2>/dev/null || true
fi
exit $status
