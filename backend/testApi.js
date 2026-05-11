

async function testApi() {
  try {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@healix.test', password: 'Password123!' })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.accessToken) {
      console.error("Login failed", loginData);
      return;
    }
    const token = loginData.accessToken;
    
    // 2. Get Prescriptions
    console.log("Fetching prescriptions...");
    const presRes = await fetch('http://localhost:5000/api/prescriptions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const presData = await presRes.json();
    
    if (!presData.length) {
      console.error("No prescriptions found", presData);
      return;
    }
    
    const prescriptionId = presData[0]._id;
    console.log(`Testing with prescription ID: ${prescriptionId}`);
    
    // 3. Test AI Explanation
    console.log("\n=== Testing /api/ai/explanation ===");
    const expRes = await fetch(`http://localhost:5000/api/ai/explanation/${prescriptionId}?lang=en`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Status:", expRes.status);
    const expText = await expRes.text();
    console.log(expText);
    
    // 4. Test AI Diet
    console.log("\n=== Testing /api/ai/diet ===");
    const dietRes = await fetch(`http://localhost:5000/api/ai/diet/${prescriptionId}?lang=en`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Status:", dietRes.status);
    const dietText = await dietRes.text();
    console.log(dietText);

  } catch (err) {
    console.error("Error:", err);
  }
}

testApi();
