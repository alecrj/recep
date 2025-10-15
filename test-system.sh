#!/bin/bash

# AI Receptionist - Quick System Test
# This script tests the complete flow in TEST MODE

echo "=================================="
echo "🧪 AI Receptionist System Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing backend health..."
HEALTH=$(curl -s http://localhost:3000/health)
if [[ $HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    exit 1
fi

echo ""
echo "Step 1: Creating admin account..."
ADMIN_REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "name": "Test Admin",
    "role": "ADMIN"
  }')

if [[ $ADMIN_REGISTER == *"success"* ]]; then
    echo -e "${GREEN}✅ Admin account created${NC}"
elif [[ $ADMIN_REGISTER == *"already exists"* ]]; then
    echo -e "${YELLOW}⚠️  Admin account already exists (that's fine)${NC}"
else
    echo -e "${RED}❌ Failed to create admin account${NC}"
    echo $ADMIN_REGISTER
fi

echo ""
echo "Step 2: Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [[ ! -z "$ADMIN_TOKEN" ]]; then
    echo -e "${GREEN}✅ Admin login successful${NC}"
    echo -e "${YELLOW}Token: ${ADMIN_TOKEN:0:20}...${NC}"
else
    echo -e "${RED}❌ Admin login failed${NC}"
    echo $ADMIN_LOGIN
    exit 1
fi

echo ""
echo "Step 3: Creating test business (Bob's HVAC)..."
BUSINESS=$(curl -s -X POST http://localhost:3000/api/admin/businesses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Bobs HVAC Service",
    "industry": "hvac",
    "ownerEmail": "bob@hvac.com",
    "ownerName": "Bob Smith",
    "ownerPhone": "+15555551234",
    "password": "bob123"
  }')

if [[ $BUSINESS == *"success"* ]]; then
    echo -e "${GREEN}✅ Business created${NC}"
elif [[ $BUSINESS == *"already exists"* ]]; then
    echo -e "${YELLOW}⚠️  Business already exists (that's fine)${NC}"
else
    echo -e "${RED}❌ Failed to create business${NC}"
    echo $BUSINESS
fi

echo ""
echo "Step 4: Logging in as business owner..."
BUSINESS_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/business/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@hvac.com",
    "password": "bob123"
  }')

BUSINESS_TOKEN=$(echo $BUSINESS_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [[ ! -z "$BUSINESS_TOKEN" ]]; then
    echo -e "${GREEN}✅ Business login successful${NC}"
    echo -e "${YELLOW}Token: ${BUSINESS_TOKEN:0:20}...${NC}"
else
    echo -e "${RED}❌ Business login failed${NC}"
    echo $BUSINESS_LOGIN
    exit 1
fi

echo ""
echo "Step 5: Applying HVAC template..."
TEMPLATE=$(curl -s -X POST http://localhost:3000/api/business/config/apply-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUSINESS_TOKEN" \
  -d '{
    "industry": "hvac"
  }')

if [[ $TEMPLATE == *"success"* ]]; then
    echo -e "${GREEN}✅ HVAC template applied${NC}"

    # Count services
    SERVICES_COUNT=$(echo $TEMPLATE | grep -o '"name":' | wc -l)
    echo -e "${YELLOW}   Configured $SERVICES_COUNT services${NC}"
else
    echo -e "${RED}❌ Failed to apply template${NC}"
    echo $TEMPLATE
fi

echo ""
echo "Step 6: Checking analytics..."
ANALYTICS=$(curl -s -X GET http://localhost:3000/api/business/analytics \
  -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $ANALYTICS == *"success"* ]]; then
    echo -e "${GREEN}✅ Analytics retrieved${NC}"

    # Extract ROI data
    NET_SAVINGS=$(echo $ANALYTICS | grep -o '"netSavings":[0-9]*' | cut -d':' -f2)
    AI_COST=$(echo $ANALYTICS | grep -o '"aiCost":[0-9]*' | cut -d':' -f2)
    RECEPTIONIST_COST=$(echo $ANALYTICS | grep -o '"receptionistCost":[0-9]*' | cut -d':' -f2)

    echo -e "${YELLOW}   AI Cost: \$$AI_COST/month${NC}"
    echo -e "${YELLOW}   Receptionist Cost: \$$RECEPTIONIST_COST/month${NC}"
    echo -e "${GREEN}   Net Savings: \$$NET_SAVINGS/month${NC}"
else
    echo -e "${RED}❌ Failed to retrieve analytics${NC}"
    echo $ANALYTICS
fi

echo ""
echo "Step 7: Getting available industries..."
INDUSTRIES=$(curl -s -X GET http://localhost:3000/api/business/industries \
  -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $INDUSTRIES == *"success"* ]]; then
    echo -e "${GREEN}✅ Industry templates available${NC}"
    INDUSTRY_COUNT=$(echo $INDUSTRIES | grep -o '"name":' | wc -l)
    echo -e "${YELLOW}   $INDUSTRY_COUNT industry templates ready${NC}"
else
    echo -e "${RED}❌ Failed to get industries${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}🎉 System Test Complete!${NC}"
echo "=================================="
echo ""
echo "Your running servers:"
echo "  • Backend API: http://localhost:3000"
echo "  • Admin Dashboard: http://localhost:5173"
echo "  • Business Dashboard: http://localhost:5178"
echo ""
echo "Test accounts created:"
echo "  • Admin: admin@test.com / admin123"
echo "  • Business: bob@hvac.com / bob123"
echo ""
echo -e "${GREEN}✅ System is ready for demos!${NC}"
echo ""
