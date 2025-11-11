#!/bin/bash
cd /etc/ssl/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx.key -out nginx.crt -subj "/CN=192.168.1.134"
ls -la nginx.*
