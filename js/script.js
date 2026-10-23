/*=====================================================
    GTRADES-AXIS™
    Main JavaScript
=====================================================*/

// ================= LOADER =================

window.addEventListener("load", () => {

    const loader = document.getElementById("loader");

    if (loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
        }, 800);
    }

});

// ================= SCROLL TO TOP =================

const scrollBtn = document.getElementById("scrollTop");

window.addEventListener("scroll", () => {

    if (scrollBtn) {

        if (window.scrollY > 500) {
            scrollBtn.classList.add("show");
        } else {
            scrollBtn.classList.remove("show");
        }

    }

});

if (scrollBtn) {

    scrollBtn.addEventListener("click", () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}

// ================= STICKY HEADER =================

const header = document.querySelector("header");

window.addEventListener("scroll", () => {

    if (!header) return;

    if (window.scrollY > 50) {

        header.style.background = "rgba(7,9,13,.98)";
        header.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";

    } else {

        header.style.background = "rgba(7,9,13,.92)";
        header.style.boxShadow = "none";

    }

});

// ================= SMOOTH SCROLL =================

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({

            behavior: "smooth",
            block: "start"

        });

    });

});

// ================= ACTIVE NAVIGATION =================

const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav a");

window.addEventListener("scroll", () => {

    let current = "";

    sections.forEach(section => {

        const sectionTop = section.offsetTop - 120;

        if (pageYOffset >= sectionTop) {

            current = section.getAttribute("id");

        }

    });

    navLinks.forEach(link => {

        link.classList.remove("active");

        if (link.getAttribute("href") === "#" + current) {

            link.classList.add("active");

        }

    });

});

// ================= HERO PARALLAX =================

const hero = document.querySelector(".hero");

window.addEventListener("scroll", () => {

    if (!hero) return;

    hero.style.backgroundPositionY = window.scrollY * 0.4 + "px";

});

// ================= SCROLL REVEAL =================

const hiddenElements = document.querySelectorAll(
".card, .academy-card, .feature, .flow-box, .testimonial-card, .faq-item, .stat-card"
);

const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");

        }

    });

}, {

    threshold: 0.15

});

hiddenElements.forEach(el => {

    el.classList.add("hidden");

    observer.observe(el);

});

// ================= COUNTER =================

const counters = document.querySelectorAll(".counter");

const counterObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if (!entry.isIntersecting) return;

        const counter = entry.target;

        const target = Number(counter.dataset.target);

        let current = 0;

        const increment = Math.ceil(target / 60);

        const timer = setInterval(() => {

            current += increment;

            if (current >= target) {

                counter.innerText = target;

                clearInterval(timer);

            } else {

                counter.innerText = current;

            }

        }, 30);

        counterObserver.unobserve(counter);

    });

});

counters.forEach(counter => {

    counterObserver.observe(counter);

});
/*=====================================================
    GTRADES-AXIS™
    Premium Interactions
=====================================================*/

// ================= FAQ ACCORDION =================

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {

    const answer = item.querySelector("p");

    if (answer) {

        answer.style.display = "none";

    }

    item.addEventListener("click", () => {

        faqItems.forEach(other => {

            if (other !== item) {

                const p = other.querySelector("p");

                if (p) p.style.display = "none";

                other.classList.remove("open");

            }

        });

        if (!answer) return;

        if (answer.style.display === "block") {

            answer.style.display = "none";
            item.classList.remove("open");

        } else {

            answer.style.display = "block";
            item.classList.add("open");

        }

    });

});

// ================= BUTTON RIPPLE =================

document.querySelectorAll(".primary-btn,.secondary-btn,.join-btn")
.forEach(button => {

    button.addEventListener("click", function(e){

        const ripple = document.createElement("span");

        const rect = this.getBoundingClientRect();

        const size = Math.max(rect.width, rect.height);

        ripple.style.width = size + "px";
        ripple.style.height = size + "px";

        ripple.style.left = (e.clientX - rect.left - size/2) + "px";
        ripple.style.top = (e.clientY - rect.top - size/2) + "px";

        ripple.className = "ripple";

        this.appendChild(ripple);

        setTimeout(() => {

            ripple.remove();

        },600);

    });

});

// ================= HERO PARALLAX IMAGE =================

const heroImage = document.querySelector(".hero-image");

window.addEventListener("mousemove",(e)=>{

    if(!heroImage) return;

    let x=(window.innerWidth/2-e.clientX)/40;

    let y=(window.innerHeight/2-e.clientY)/40;

    heroImage.style.transform=
    `translate(${x}px,${y}px)`;

});

// ================= TYPING EFFECT =================

const typing = document.querySelector(".typing");

if(typing){

const words=[

"Market Structure",

"Liquidity",

"Supply & Demand",

"Smart Money",

"Professional Trading"

];

let word=0;
let letter=0;
let deleting=false;

function type(){

let text=words[word];

if(!deleting){

typing.textContent=text.substring(0,letter++);

if(letter>text.length){

deleting=true;

setTimeout(type,1500);

return;

}

}else{

typing.textContent=text.substring(0,--letter);

if(letter===0){

deleting=false;

word++;

if(word>=words.length){

word=0;

}

}

}

setTimeout(type,deleting?40:80);

}

type();

}

// ================= NAVBAR HIDE ON SCROLL =================

let lastScroll=0;

window.addEventListener("scroll",()=>{

const current=window.pageYOffset;

if(current>lastScroll && current>120){

header.style.top="-90px";

}else{

header.style.top="0";

}

lastScroll=current;

});

// ================= FLOATING ANIMATION =================

document.querySelectorAll(".floating").forEach(item=>{

item.animate(

[

{transform:"translateY(0px)"},

{transform:"translateY(-15px)"},

{transform:"translateY(0px)"}

],

{

duration:3000+Math.random()*2000,

iterations:Infinity

}

);

});

// ================= YEAR =================

const year=document.getElementById("year");

if(year){

year.textContent=new Date().getFullYear();

}

// ================= PREVENT IMAGE DRAG =================

document.querySelectorAll("img").forEach(img=>{

img.setAttribute("draggable","false");

});

// ================= CONSOLE MESSAGE =================

console.log("%cGTRADES-AXIS™",
"color:#0A84FF;font-size:28px;font-weight:bold;");

console.log(
"Trade with Structure. Execute with Precision."
);
