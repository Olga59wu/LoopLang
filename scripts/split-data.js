const fs = require('fs');
const catalogPath = './data/catalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

catalog.forEach(langGroup => {
    const lang = langGroup.lang;
    const oldDataPath = `./data/${lang}/greetings.json`;
    if (!fs.existsSync(oldDataPath)) return;
    
    // Original 88 sentences
    const allSentences = JSON.parse(fs.readFileSync(oldDataPath, 'utf8'));
    
    const categories = {
        greetings: [],
        dining: [],
        shopping: [],
        transport: [],
        hotel: [],
        emergency: []
    };
    
    allSentences.forEach(s => {
        const tags = s.tags || [];
        if (tags.includes('restaurant')) {
            categories.dining.push(s);
        } else if (tags.includes('store') || tags.includes('shopping')) {
            categories.shopping.push(s);
        } else if (tags.includes('transport') || tags.includes('map') || tags.includes('airport')) {
            categories.transport.push(s);
        } else if (tags.includes('hotel')) {
            categories.hotel.push(s);
        } else if (tags.includes('emergency')) {
            categories.emergency.push(s);
        } else {
            categories.greetings.push(s);
        }
    });

    for (const [slug, data] of Object.entries(categories)) {
        // Re-assign order for cleanliness
        data.forEach((item, index) => {
            item.order = index + 1;
        });
        
        fs.writeFileSync(`./data/${lang}/${slug}.json`, JSON.stringify(data, null, 2));
        
        const topicObj = langGroup.topics.find(t => t.slug === slug);
        if (topicObj) {
            topicObj.sentenceCount = data.length;
        }
    }
});

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Split and mapping complete!');
