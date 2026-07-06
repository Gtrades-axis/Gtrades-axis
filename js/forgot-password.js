alert("Welcome back, " + (user.displayName || user.email) + "!");

// Redirect to the members dashboard
window.location.href = "dashboard.html";

}catch(error){

let message = "";

switch(error.code){

case "auth/user-not-found":

message = "No account exists with this email.";

break;

case "auth/wrong-password":

message = "Incorrect password.";

break;

case "auth/invalid-credential":

message = "Invalid email or password.";

break;

case "auth/invalid-email":

message = "Please enter a valid email address.";

break;

case "auth/too-many-requests":

message = "Too many failed attempts. Try again later.";

break;

default:

message = error.message;

}

alert(message);

}

}

// ================= GOOGLE LOGIN =================

async function googleLogin(){

const provider = new GoogleAuthProvider();

try{

await signInWithPopup(auth, provider);

window.location.href = "dashboard.html";

}catch(error){

alert(error.message);

}

}
