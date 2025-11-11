# PowerShell script to fix nginx on QNAP
$password = "Kis@1963"
$username = "orlovus"
$hostname = "192.168.1.134"

# Create a secure string for the password
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($username, $securePassword)

Write-Host "Stopping and removing existing nginx container..."
$command1 = "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker stop rydora-nginx && /share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker rm rydora-nginx"
Invoke-Command -ComputerName $hostname -Credential $credential -ScriptBlock { Invoke-Expression $using:command1 }

Write-Host "Creating new nginx container..."
$command2 = "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker run -d --name rydora-nginx -p 9443:80 nginx:alpine"
Invoke-Command -ComputerName $hostname -Credential $credential -ScriptBlock { Invoke-Expression $using:command2 }

Write-Host "Writing nginx configuration..."
$config = @"
server {
    listen 80;
    server_name localhost;
    location / {
        proxy_pass http://192.168.1.134:5000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
}
"@

$command3 = "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker exec rydora-nginx sh -c 'echo \"$config\" > /etc/nginx/conf.d/default.conf'"
Invoke-Command -ComputerName $hostname -Credential $credential -ScriptBlock { Invoke-Expression $using:command3 }

Write-Host "Restarting nginx..."
$command4 = "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker restart rydora-nginx"
Invoke-Command -ComputerName $hostname -Credential $credential -ScriptBlock { Invoke-Expression $using:command4 }

Write-Host "Done! Try accessing http://192.168.1.134:9443"

