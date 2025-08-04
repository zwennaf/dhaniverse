import { useEffect } from "react";

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
    noIndex?: boolean;
}

const defaultSEO = {
    title: "Dhaniverse - Gamified Financial Literacy Platform | Learn Money Management Through Gaming",
    description:
        "Transform your financial future with Dhaniverse - India's first gamified financial literacy platform. Learn investing, budgeting, and money management through an immersive 2D RPG game. Perfect for Gen Z and millennials.",
    keywords:
        "dhaniverse, dhaniverse game, dhaniverse.in, financial literacy game, money management game, financial education game, investing game, budgeting game, financial RPG, money RPG, financial simulation, stock market game, personal finance game, financial learning platform, gamified finance, finance education India, money skills game, financial planning game, investment simulator, budget simulator, financial literacy platform, money management app, financial education app, learn finance through gaming, financial game online, money management simulator, financial literacy India, Gen Z finance, millennial finance, financial education for students, interactive finance learning",
    image: "https://dhaniverse.in/og-image.jpg",
    url: "https://dhaniverse.in/",
    type: "website",
};

const updateMetaTag = (name: string, content: string, property = false) => {
    const selector = property
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement;

    if (!meta) {
        meta = document.createElement("meta");
        if (property) {
            meta.setAttribute("property", name);
        } else {
            meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
    }

    meta.setAttribute("content", content);
};

const updateCanonical = (url: string) => {
    let canonical = document.querySelector(
        'link[rel="canonical"]'
    ) as HTMLLinkElement;

    if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
    }

    canonical.setAttribute("href", url);
};

const updateStructuredData = (data: object, id: string) => {
    try {
        // Remove all existing SEO structured data to prevent conflicts
        const existingScripts = document.querySelectorAll("script[data-seo-id]");
        existingScripts.forEach((script) => script.remove());

        // Add new structured data
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-id", id);
        
        // Use innerHTML instead of textContent to avoid CSP issues
        script.innerHTML = JSON.stringify(data);
        document.head.appendChild(script);
    } catch (error) {
        console.warn("Failed to update structured data:", error);
    }
};

const SEO: React.FC<SEOProps> = ({
    title = defaultSEO.title,
    description = defaultSEO.description,
    keywords = defaultSEO.keywords,
    image = defaultSEO.image,
    url = defaultSEO.url,
    type = defaultSEO.type,
    noIndex = false,
}) => {
    useEffect(() => {
        try {
            // Debug logging in development
            if (process.env.NODE_ENV === "development") {
                console.log("SEO Update:", { title, url, type });
            }

            // Update title
            document.title = title;

        // Update meta tags
        updateMetaTag("description", description);
        updateMetaTag("keywords", keywords);
        updateMetaTag(
            "robots",
            noIndex
                ? "noindex, nofollow"
                : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        );

        // Update Open Graph tags
        updateMetaTag("og:type", type, true);
        updateMetaTag("og:title", title, true);
        updateMetaTag("og:description", description, true);
        updateMetaTag("og:url", url, true);
        updateMetaTag("og:image", image, true);
        updateMetaTag("og:site_name", "Dhaniverse", true);

        // Update Twitter Card tags
        updateMetaTag("twitter:card", "summary_large_image");
        updateMetaTag("twitter:title", title);
        updateMetaTag("twitter:description", description);
        updateMetaTag("twitter:image", image);

        // Update canonical URL
        updateCanonical(url);

        // Update structured data based on type
        if (type === "website") {
            updateStructuredData(
                {
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    name: "Dhaniverse",
                    description: description,
                    url: url,
                    applicationCategory: "EducationalApplication",
                    operatingSystem: "Web Browser",
                    offers: {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "INR",
                    },
                    creator: {
                        "@type": "Organization",
                        name: "Dhaniverse",
                        founder: [
                            {
                                "@type": "Person",
                                name: "Gursimran Singh",
                                jobTitle: "Founder & CEO",
                            },
                            {
                                "@type": "Person",
                                name: "Jashanjot Singh",
                                jobTitle: "Co-Founder",
                            },
                            {
                                "@type": "Person",
                                name: "Aagam Jain",
                                jobTitle: "Co-Founder",
                            },
                            {
                                "@type": "Person",
                                name: "Ekaspreet Singh",
                                jobTitle: "Co-Founder",
                            },
                            {
                                "@type": "Person",
                                name: "Jagjeevan Kashid",
                                jobTitle: "Co-Founder",
                            },
                        ],
                    },
                    audience: {
                        "@type": "Audience",
                        audienceType: "Gen Z and Millennials",
                    },
                    keywords: keywords,
                    inLanguage: "en-IN",
                    screenshot: image,
                },
                "website"
            );
        } else if (type === "game") {
            updateStructuredData(
                {
                    "@context": "https://schema.org",
                    "@type": "Game",
                    name: "Dhaniverse Financial RPG",
                    description: description,
                    url: url,
                    genre: ["Educational", "RPG", "Simulation"],
                    gamePlatform: "Web Browser",
                    applicationCategory: "Game",
                    offers: {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "INR",
                    },
                    creator: {
                        "@type": "Organization",
                        name: "Dhaniverse",
                        founder: [
                            {
                                "@type": "Person",
                                name: "Gursimran Singh",
                                jobTitle: "Founder & CEO",
                            },
                            {
                                "@type": "Person",
                                name: "Jashanjot Singh",
                                jobTitle: "Co-Founder",
                            },
                            {
                                "@type": "Person",
                                name: "Aagam Jain",
                                jobTitle: "CPO",
                            },
                            {
                                "@type": "Person",
                                name: "Ekaspreet Singh",
                                jobTitle: "CTO",
                            },
                            {
                                "@type": "Person",
                                name: "Jagjeevan Kashid",
                                jobTitle: "Engineer",
                            },
                        ],
                    },
                    audience: {
                        "@type": "Audience",
                        audienceType: "Gen Z and Millennials",
                    },
                    keywords: keywords,
                    inLanguage: "en-IN",
                },
                "game"
            );
        }
        } catch (error) {
            console.warn("SEO update failed:", error);
        }
    }, [title, description, keywords, image, url, type, noIndex]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            try {
                // Clean up structured data when component unmounts
                const seoScripts = document.querySelectorAll("script[data-seo-id]");
                seoScripts.forEach((script) => script.remove());
            } catch (error) {
                console.warn("SEO cleanup failed:", error);
            }
        };
    }, []);

    return null; // This component doesn't render anything
};

export default SEO;
