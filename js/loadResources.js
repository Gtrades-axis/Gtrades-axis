function displayResources() {

    container.innerHTML = "";

    const filtered = resources.filter(resource => {

        const categoryMatch =
            currentCategory === "All" ||
            resource.category === currentCategory;

        const searchMatch =
            resource.title
            .toLowerCase()
            .includes(searchInput.value.toLowerCase());

        return categoryMatch && searchMatch;

    });

    if(filtered.length===0){

        container.innerHTML=`
            <div class="empty-state">
                <h2>No Resources Found</h2>
            </div>
        `;

        return;
    }

    filtered.forEach(resource=>{

        let icon="📄";

        if(resource.category==="indicators") icon="📈";
        if(resource.category==="journals") icon="📒";
        if(resource.category==="strategies") icon="🎯";
        if(resource.category==="videos") icon="🎥";

        container.innerHTML += `

        <div class="resource-card">

            <div class="resource-header">

                <span class="resource-icon">${icon}</span>

                ${
                    resource.premiumOnly
                    ? '<span class="premium-badge">PREMIUM</span>'
                    : ''
                }

            </div>

            <h3>${resource.title}</h3>

            <p>${resource.description || ""}</p>

            <small style="word-break:break-all;color:red;">
                ${resource.link}
            </small>

            <br><br>

            <a
                class="download-btn"
                href="${resource.link}"
                target="_blank">

                📥 Download

            </a>

        </div>

        `;

    });

}
