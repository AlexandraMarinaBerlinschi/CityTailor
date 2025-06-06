# test_ml_simple.py - Test simplu pentru sistemul ML

import asyncio
import aiohttp
import json

async def create_test_user(session, base_url):
    """Creează un utilizator de test dacă nu există"""
    test_user_data = {
        "email": "test@citytailor.com",
        "password": "test123456",
        "name": "Test User"
    }
    
    try:
        # Încearcă să creezi utilizatorul
        async with session.post(f"{base_url}/auth/register", json=test_user_data) as response:
            if response.status == 200:
                result = await response.json()
                return result.get("user_id", "123e4567-e89b-12d3-a456-426614174000")
            else:
                # Poate că utilizatorul există deja, încearcă login
                login_data = {"email": test_user_data["email"], "password": test_user_data["password"]}
                async with session.post(f"{base_url}/auth/login", json=login_data) as login_response:
                    if login_response.status == 200:
                        result = await login_response.json()
                        return result.get("user_id", "123e4567-e89b-12d3-a456-426614174000")
    except Exception as e:
        print(f"   ⚠️  Couldn't create test user, using fallback UUID: {e}")
    
    # Fallback - returnează UUID-ul de test
    return "123e4567-e89b-12d3-a456-426614174000"

async def test_ml_system():
    """Test simplu pentru sistemul ML"""
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        
        print("🧪 Testing ML Recommendation System...")
        print("=" * 50)
        
        # Creează utilizator de test
        print("\n0. Setting up test user...")
        test_user_id = await create_test_user(session, base_url)
        print(f"   ✅ Using test user ID: {test_user_id}")
        
        # Test 1: Verifică sistemul ML
        print("\n1. Testing ML System Health...")
        try:
            async with session.get(f"{base_url}/ml/test") as response:
                result = await response.json()
                if response.status == 200:
                    print("   ✅ ML System is healthy")
                    print(f"   📊 Places in DB: {result['ml_system_health']['places_in_db']}")
                    print(f"   📈 Activities tracked: {result['ml_system_health']['activities_tracked']}")
                else:
                    print("   ❌ ML System has issues")
        except Exception as e:
            print(f"   ❌ Failed to connect: {e}")
            return
        
        # Test 2: Track o căutare
        print("\n2. Testing Search Tracking...")
        search_data = {
            "user_id": test_user_id,
            "city": "Paris",
            "activities": ["Cultural", "Gastronomy"],
            "time": "2-4h"
        }
        
        try:
            async with session.post(f"{base_url}/ml/track-search", json=search_data) as response:
                result = await response.json()
                if response.status == 200:
                    print("   ✅ Search tracked successfully")
                else:
                    print(f"   ❌ Search tracking failed: {result}")
        except Exception as e:
            print(f"   ❌ Search tracking error: {e}")
        
        # Test 3: Track o interacțiune
        print("\n3. Testing Interaction Tracking...")
        interaction_data = {
            "user_id": test_user_id,
            "interaction_type": "favorite",
            "place_name": "Eiffel Tower",
            "place_id": "eiffel_tower",
            "city": "Paris"
        }
        
        try:
            async with session.post(f"{base_url}/ml/track-interaction", json=interaction_data) as response:
                result = await response.json()
                if response.status == 200:
                    print("   ✅ Interaction tracked successfully")
                else:
                    print(f"   ❌ Interaction tracking failed: {result}")
        except Exception as e:
            print(f"   ❌ Interaction tracking error: {e}")
        
        # Test 4: Obține recomandări pentru homepage
        print("\n4. Testing Home Recommendations...")
        try:
            params = {"user_id": test_user_id, "limit": 5}
            async with session.get(f"{base_url}/ml/home-recommendations", params=params) as response:
                result = await response.json()
                if response.status == 200:
                    recs = result.get("recommendations", {})
                    main_recs = recs.get("main_recommendations", [])
                    print(f"   ✅ Generated {len(main_recs)} recommendations")
                    
                    if main_recs:
                        print("   🎯 Top recommendation:")
                        top_rec = main_recs[0]
                        print(f"      - {top_rec['name']} in {top_rec['city']}")
                        print(f"      - Reason: {top_rec['recommendation_reason']}")
                else:
                    print(f"   ❌ Recommendations failed: {result}")
        except Exception as e:
            print(f"   ❌ Recommendations error: {e}")
        
        # Test 5: Verifică profilul utilizatorului
        print("\n5. Testing User Profile...")
        try:
            async with session.get(f"{base_url}/ml/user-profile/{test_user_id}") as response:
                result = await response.json()
                if response.status == 200:
                    profile = result.get("profile", {})
                    preferences = profile.get("preferences", {})
                    print("   ✅ User profile retrieved")
                    print(f"   🎭 Cultural: {preferences.get('cultural', 0):.2f}")
                    print(f"   🥾 Outdoor: {preferences.get('outdoor', 0):.2f}")
                    print(f"   🍽️ Gastronomy: {preferences.get('gastronomy', 0):.2f}")
                else:
                    print(f"   ❌ Profile retrieval failed: {result}")
        except Exception as e:
            print(f"   ❌ Profile error: {e}")
        
        # Test 6: Verifică trending places
        print("\n6. Testing Trending Places...")
        try:
            async with session.get(f"{base_url}/ml/trending", params={"limit": 3}) as response:
                result = await response.json()
                if response.status == 200:
                    trending = result.get("trending_places", [])
                    print(f"   ✅ Found {len(trending)} trending places")
                    
                    for place in trending[:2]:
                        print(f"      - {place['name']} in {place['city']} (score: {place['trending_score']})")
                else:
                    print(f"   ❌ Trending places failed: {result}")
        except Exception as e:
            print(f"   ❌ Trending places error: {e}")
        
        # Test 7: Test submit-preferences-v2
        print("\n7. Testing Enhanced Search Endpoint...")
        search_v2_data = {
            "user_id": test_user_id,
            "city": "Rome",
            "activities": ["Cultural", "Outdoor"],
            "time": ">4h"
        }
        
        try:
            async with session.post(f"{base_url}/submit-preferences-v2", json=search_v2_data) as response:
                result = await response.json()
                if response.status == 200:
                    recommendations = result.get("recommendations", [])
                    sources = result.get("sources", {})
                    print(f"   ✅ Enhanced search returned {len(recommendations)} recommendations")
                    print(f"   📡 Sources: Amadeus={sources.get('amadeus', 0)}, ML={sources.get('ml_personalized', 0)}")
                else:
                    print(f"   ❌ Enhanced search failed: {result}")
        except Exception as e:
            print(f"   ❌ Enhanced search error: {e}")
        
        print("\n" + "=" * 50)
        print("🎉 ML System testing completed!")
        print("\n💡 Next steps:")
        print("1. Check Supabase to see the tracked data")
        print("2. Test more interactions to build user profile")
        print("3. Integrate ML recommendations in frontend")

if __name__ == "__main__":
    print("🚀 CityTailor ML System Tester")
    print("Make sure your backend is running: uvicorn main:app --reload")
    print()
    
    asyncio.run(test_ml_system())