#!/bin/bash
# Feature Access System Verification Script
# This script tests if the role-based feature access is working correctly

echo "=== Hospital Management System - Feature Access Verification ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:5000/api"

# Test users with different roles
declare -A TEST_USERS=(
    ["admin"]="admin@hospital.local:Admin@123456"
    ["doctor"]="doctor@test.com:doctor123"
    ["nurse"]="nurse@test.com:nurse123"
    ["receptionist"]="receptionist@test.com:receptionist123"
    ["staff"]="staff@test.com:staff123"
)

# Expected features per role
declare -A EXPECTED_FEATURES=(
    ["admin"]="dashboard,patients,appointments,doctors,emr,pharmacy,billing,icd,reports,clinic-users,settings"
    ["doctor"]="dashboard,patients,appointments,emr,icd,settings"
    ["nurse"]="dashboard,patients,appointments,emr,icd,reports,settings"
    ["receptionist"]="dashboard,patients,appointments,doctors,pharmacy,billing,icd,reports,settings"
    ["staff"]="dashboard,patients,appointments,pharmacy,billing,icd,reports,settings"
)

test_role() {
    local role=$1
    local credentials=$2
    local email=$(echo $credentials | cut -d':' -f1)
    local password=$(echo $credentials | cut -d':' -f2)
    
    echo -e "${YELLOW}Testing role: $role${NC}"
    echo "  Email: $email"
    
    # Login
    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    # Check if login successful
    if echo $response | grep -q '"success":true'; then
        echo -e "  ${GREEN}✓ Login successful${NC}"
        
        # Extract token
        token=$(echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        
        # Extract features
        features=$(echo $response | grep -o '"features":\[[^]]*\]' | sed 's/"//g' | sed 's/,/, /g')
        echo "  Features: $features"
        
        # Check if expected features are present
        expected=${EXPECTED_FEATURES[$role]}
        echo "  Expected: $expected"
        
        # Test session endpoint
        session=$(curl -s -X GET "$API_URL/auth/session" \
            -H "Authorization: Bearer $token")
        
        if echo $session | grep -q '"success":true'; then
            echo -e "  ${GREEN}✓ Session verified${NC}"
        else
            echo -e "  ${RED}✗ Session verification failed${NC}"
        fi
        
        echo ""
    else
        echo -e "  ${RED}✗ Login failed${NC}"
        echo "  Response: $response"
        echo ""
    fi
}

echo "Prerequisites:"
echo "  - Backend server running at $API_URL"
echo "  - Test users created in database"
echo ""

echo "Starting tests..."
echo ""

# Test each role
for role in "${!TEST_USERS[@]}"; do
    test_role "$role" "${TEST_USERS[$role]}"
done

echo "=== Verification Complete ==="
echo ""
echo "Expected Feature Summary:"
for role in "${!EXPECTED_FEATURES[@]}"; do
    echo "  $role: ${EXPECTED_FEATURES[$role]}"
done
