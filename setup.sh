#!/bin/bash

# =========================================
# 🚀 Task Manager - Setup Script
# For Linux Mint / Ubuntu / Debian
# =========================================

echo "========================================"
echo "🚀 Task Manager - Setup Script"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ لا تشغل السكريبت كـ root!${NC}"
    echo "استخدم: ./setup.sh"
    exit 1
fi

# Create directories
echo -e "${BLUE}📁 إنشاء المجلدات...${NC}"
mkdir -p ~/task-manager-backend
mkdir -p ~/task-manager-frontend

# Check Node.js
echo -e "${BLUE}🔍 التحقق من Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️ Node.js غير مثبت. جاري التثبيت...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check wget and unzip
echo -e "${BLUE}🔍 التحقق من الأدوات المطلوبة...${NC}"
sudo apt install -y wget unzip curl

# Download PocketBase
echo -e "${BLUE}📥 تحميل PocketBase...${NC}"
cd ~/task-manager-backend

if [ ! -f "pocketbase" ]; then
    wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.22.4/pocketbase_0.22.4_linux_amd64.zip
    unzip -o pocketbase_0.22.4_linux_amd64.zip
    rm pocketbase_0.22.4_linux_amd64.zip
    chmod +x pocketbase
    echo -e "${GREEN}✅ تم تحميل PocketBase بنجاح!${NC}"
else
    echo -e "${GREEN}✅ PocketBase موجود بالفعل${NC}"
fi

# Create systemd service for PocketBase
echo -e "${BLUE}⚙️ إنشاء خدمة PocketBase...${NC}"
sudo tee /etc/systemd/system/pocketbase.service > /dev/null << EOF
[Unit]
Description=PocketBase Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/task-manager-backend
ExecStart=$HOME/task-manager-backend/pocketbase serve --http="0.0.0.0:8090"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start PocketBase
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

echo -e "${GREEN}✅ تم تشغيل PocketBase!${NC}"

# Wait for PocketBase to start
echo -e "${BLUE}⏳ انتظار تشغيل PocketBase...${NC}"
sleep 3

# Check if PocketBase is running
if curl -s http://localhost:8090/api/health > /dev/null; then
    echo -e "${GREEN}✅ PocketBase يعمل بشكل صحيح!${NC}"
else
    echo -e "${RED}❌ مشكلة في تشغيل PocketBase${NC}"
    echo "تحقق من: sudo systemctl status pocketbase"
fi

# Frontend setup
echo -e "${BLUE}📦 إعداد Frontend...${NC}"
cd ~/task-manager-frontend

# Copy files (assuming current directory has the project)
if [ -f "package.json" ]; then
    npm install
    npm run build
    echo -e "${GREEN}✅ تم بناء Frontend!${NC}"
fi

# Install serve for hosting
echo -e "${BLUE}🌐 تثبيت serve...${NC}"
sudo npm install -g serve

echo ""
echo "========================================"
echo -e "${GREEN}🎉 تم الإعداد بنجاح!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}📋 الخطوات التالية:${NC}"
echo ""
echo "1. افتح PocketBase Admin:"
echo -e "   ${BLUE}http://localhost:8090/_/${NC}"
echo "   (أنشئ حساب Admin أول مرة)"
echo ""
echo "2. استورد الـ Schema:"
echo "   - اذهب إلى Settings > Import collections"
echo "   - استورد ملف pocketbase-schema.json"
echo ""
echo "3. شغّل Frontend:"
echo -e "   ${BLUE}cd ~/task-manager-frontend && serve -s dist -l 3000${NC}"
echo ""
echo "4. افتح التطبيق:"
echo -e "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "========================================"
echo -e "${GREEN}📞 للدعم: واتساب 01026276594${NC}"
echo -e "${GREEN}👨‍💻 تطوير: Mohamed Alaa${NC}"
echo "========================================"
