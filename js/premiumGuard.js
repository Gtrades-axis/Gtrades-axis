/* ======================================================
   GTRADES-AXIS™ PREMIUM GUARD
====================================================== */

window.PremiumGuard = async function(options = {}) {

    const feature = options.feature || "Premium Feature";

    // Firebase Authentication check
    firebase.auth().onAuthStateChanged(async(user)=>{

        // ==================================================
        // USER NOT LOGGED IN
        // ==================================================

        if(!user){

            showOverlay(

                "🔐 Login Required",

                "Please login to continue.",

                [
                    {
                        text:"Login",
                        url:"login.html",
                        primary:true
                    }
                ]

            );

            return;

        }

        // ==================================================
        // GET USER DOCUMENT
        // ==================================================

        const doc = await firebase.firestore()

        .collection("users")

        .doc(user.uid)

        .get();

        if(!doc.exists){

            showOverlay(

                "Account Not Found",

                "Please contact support."

            );

            return;

        }

        const data = doc.data();

        // ==================================================
        // ACCOUNT APPROVAL
        // ==================================================

        if(data.active!==true){

            showOverlay(

                "⏳ Awaiting Approval",

                "Your account is waiting for administrator approval.",

                [

                    {

                        text:"Dashboard",

                        url:"dashboard.html",

                        primary:true

                    }

                ]

            );

            return;

        }

        // ==================================================
        // PREMIUM MEMBERSHIP
        // ==================================================

        if(data.membership!=="premium"){

            showPremium(

                feature

            );

            return;

        }

        // ==================================================
        // ACCESS GRANTED
        // ==================================================

        document.body.classList.add(

            "premium-authorized"

        );

    });

};

/* ======================================================
   PREMIUM WINDOW
====================================================== */

function showPremium(feature){

    showOverlay(

        "⭐ Premium Required",

        `${feature} is available exclusively to GTRADES-AXIS™ Premium Members.`,

        [

            {

                text:"Upgrade Membership",

                url:"membership.html",

                primary:true

            },

            {

                text:"Back Dashboard",

                url:"dashboard.html"

            }

        ]

    );

}
/* ======================================================
   REUSABLE OVERLAY
====================================================== */

function showOverlay(title,message,buttons=[]){

    // Prevent duplicate overlays
    if(document.getElementById("premiumGuardOverlay")){

        return;

    }

    // Blur page
    document.body.classList.add("premium-locked");

    const overlay=document.createElement("div");

    overlay.id="premiumGuardOverlay";

    overlay.className="premium-guard-overlay";

    let buttonsHTML="";

    buttons.forEach(button=>{

        buttonsHTML+=`

            <a

            href="${button.url}"

            class="premium-btn

            ${button.primary?"primary":"secondary"}">

                ${button.text}

            </a>

        `;

    });

    overlay.innerHTML=`

    <div class="premium-card">

        <div class="premium-icon">

            🔒

        </div>

        <h1>

            ${title}

        </h1>

        <p>

            ${message}

        </p>

        <div class="premium-features">

            <h3>

                Premium Membership Includes

            </h3>

            <ul>

                <li>📒 Professional Trading Journal</li>

                <li>🎓 Premium Trading Academy</li>

                <li>🤖 AI Trade Review</li>

                <li>📊 Advanced Analytics</li>

                <li>📚 Premium Resources</li>

                <li>🏆 Certificates</li>

                <li>🚀 Future Premium Updates</li>

            </ul>

        </div>

        <div class="premium-buttons">

            ${buttonsHTML}

        </div>

    </div>

    `;

    document.body.appendChild(overlay);

}
