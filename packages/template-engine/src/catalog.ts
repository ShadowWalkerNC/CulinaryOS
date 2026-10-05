// Auto-generated & typed catalog of Plated restaurant templates for CulinaryOS Web
import type { TemplateManifest, BusinessType } from '@culinaryos/types';

export const BUILTIN_TEMPLATES: Record<string, TemplateManifest> = {
  "bakery": {
    "manifestVersion": "2.0",
    "businessType": "bakery",
    "displayName": "Bakery",
    "description": "Artisan bakery or pastry shop with product menu, gallery, online pre-order CTA, and about story. Soft warm aesthetic by default.",
    "defaultStyle": "market",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Bakery Name",
        "hint": "The name on your storefront.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Baked with love since 2012\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Bakery",
        "hint": "Your story, your specialities, what makes your bread / pastries unique.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone Number",
        "hint": "For pre-orders and wholesale.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "Custom orders and wholesale inquiries.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Photo",
        "hint": "Your best product shot or storefront. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "Soft pastels or warm creams work well. e.g. #d4a96a.",
        "wizardStep": 6
      },
      {
        "field": "locations",
        "type": "location",
        "required": false,
        "label": "Location & Hours",
        "hint": "Address and opening hours — bakeries are often early!",
        "wizardStep": 4
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Products / Menu",
        "hint": "Breads, pastries, cakes, seasonal items. Prices optional.",
        "wizardStep": 5
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Product photography drives bakery traffic.",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "Good for local community reach.",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Helps morning commuters find you.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "menu",
          "social.instagram"
        ],
        "sections": [
          {
            "id": "bk-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.25,
                  "ctaLabel": "Shop Our Menu",
                  "ctaHref": "/menu"
                }
              }
            ]
          },
          {
            "id": "bk-menu",
            "name": "Featured Items",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 2,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "bk-order",
            "name": "Pre-Order CTA",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-order",
                "type": "cta",
                "order": 0,
                "visible": true,
                "config": {
                  "label": "Place a Custom Order",
                  "href": "/order"
                }
              }
            ]
          },
          {
            "id": "bk-gallery",
            "name": "Gallery",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-gallery",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 3
                }
              }
            ]
          },
          {
            "id": "bk-social",
            "name": "Instagram",
            "order": 4,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          },
          {
            "id": "bk-hours",
            "name": "Hours & Map",
            "order": 5,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-bk-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 280
                }
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "bk-menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "gallery",
        "path": "/gallery",
        "title": "Gallery",
        "optional": true,
        "usesSlots": [],
        "sections": [
          {
            "id": "bk-gallery-full",
            "name": "Photo Gallery",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-gallery-full",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 4
                }
              }
            ]
          }
        ]
      },
      {
        "id": "order",
        "path": "/order",
        "title": "Order",
        "optional": true,
        "usesSlots": [
          "business.phone",
          "business.email"
        ],
        "sections": [
          {
            "id": "bk-order-info",
            "name": "How to Order",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-order-info",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-bk-order-cta",
                "type": "cta",
                "order": 1,
                "visible": true,
                "config": {
                  "label": "Email Your Order",
                  "href": "mailto:"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "bk-about",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-about",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email",
          "locations"
        ],
        "sections": [
          {
            "id": "bk-contact",
            "name": "Contact",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bk-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-bk-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 300
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "bar": {
    "manifestVersion": "2.0",
    "businessType": "bar",
    "displayName": "Bar",
    "description": "Craft bar, cocktail lounge, or pub with drinks menu, weekly events, specials board, and social feed. Dark-mode-first design.",
    "defaultStyle": "midnight",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Bar Name",
        "hint": "The name above the door.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Craft cocktails. No rules.\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Bar",
        "hint": "Vibe, concept, history — tell the story.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone Number",
        "hint": "For reservations and event bookings.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "For events and private hire inquiries.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Image",
        "hint": "Moody bar interior or cocktail shot. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Accent Color",
        "hint": "A pop of color against dark backgrounds. e.g. #d4af37.",
        "wizardStep": 6
      },
      {
        "field": "locations",
        "type": "location",
        "required": false,
        "label": "Location & Hours",
        "hint": "Address, city, opening hours.",
        "wizardStep": 4
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Drinks Menu",
        "hint": "Cocktails, beer, wine, spirits. Use categories freely.",
        "wizardStep": 5
      },
      {
        "field": "specials",
        "type": "schedule",
        "required": false,
        "label": "Specials / Happy Hour",
        "hint": "Daily specials, happy hour times, promotions.",
        "wizardStep": 5
      },
      {
        "field": "events",
        "type": "schedule",
        "required": false,
        "label": "Events",
        "hint": "DJ nights, trivia, live music, private hire dates.",
        "wizardStep": 8
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Cocktail shots drive traffic.",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "Good for events promotion.",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Reviews drive walk-ins.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "hint": "e.g. \"The Copper Still | Craft Cocktail Bar, Nashville\"",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "specials",
          "social.instagram"
        ],
        "sections": [
          {
            "id": "bar-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.6,
                  "ctaLabel": "See the Menu",
                  "ctaHref": "/drinks"
                }
              }
            ]
          },
          {
            "id": "bar-specials",
            "name": "Specials",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-specials",
                "type": "specials",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "bar-events",
            "name": "Upcoming Events",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-events",
                "type": "events-list",
                "order": 0,
                "visible": true,
                "config": {
                  "maxItems": 3
                }
              }
            ]
          },
          {
            "id": "bar-social",
            "name": "Instagram",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          },
          {
            "id": "bar-hours",
            "name": "Hours & Map",
            "order": 4,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-bar-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 300
                }
              }
            ]
          }
        ]
      },
      {
        "id": "drinks",
        "path": "/drinks",
        "title": "Drinks",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "bar-menu",
            "name": "Drinks Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "events",
        "path": "/events",
        "title": "Events",
        "optional": false,
        "usesSlots": [
          "events"
        ],
        "sections": [
          {
            "id": "bar-events-full",
            "name": "All Events",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-events-full",
                "type": "events-list",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "bar-about",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-about",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email",
          "locations"
        ],
        "sections": [
          {
            "id": "bar-contact",
            "name": "Contact",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-bar-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-bar-cta",
                "type": "cta",
                "order": 1,
                "visible": true,
                "config": {
                  "label": "Book a Private Event",
                  "href": "mailto:"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "cafe": {
    "manifestVersion": "2.0",
    "businessType": "cafe",
    "displayName": "Cafe",
    "description": "Coffee shop or neighbourhood café with drinks and food menu, warm about story, photo gallery, and simple contact page.",
    "defaultStyle": "market",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Cafe Name",
        "hint": "What's on the sign outside?",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Good coffee. Good people.\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Cafe",
        "hint": "Who you are, what you serve, your neighbourhood vibe.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone Number",
        "hint": "Optional — many cafes skip this.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "For wholesale or event inquiries.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Photo",
        "hint": "Your space, your coffee art. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "Warm tones work well — e.g. #7a5230.",
        "wizardStep": 6
      },
      {
        "field": "locations",
        "type": "location",
        "required": false,
        "label": "Location & Hours",
        "hint": "Address, city, and opening hours.",
        "wizardStep": 4
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Menu",
        "hint": "Coffee, tea, food. Use categories: Drinks, Food, Pastries.",
        "wizardStep": 5
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Latte art performs very well on Instagram.",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Most cafe discovery happens on Google Maps.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "menu",
          "social.instagram"
        ],
        "sections": [
          {
            "id": "cafe-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.3,
                  "ctaLabel": "See the Menu",
                  "ctaHref": "/menu"
                }
              }
            ]
          },
          {
            "id": "cafe-menu",
            "name": "Menu Preview",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 3,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "cafe-hours",
            "name": "Hours & Map",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-cafe-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 280
                }
              }
            ]
          },
          {
            "id": "cafe-social",
            "name": "Instagram",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "cafe-menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "cafe-about",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-about",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "cafe-gallery",
            "name": "Gallery",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-gallery",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 3
                }
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email",
          "locations"
        ],
        "sections": [
          {
            "id": "cafe-contact",
            "name": "Find Us",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cafe-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-cafe-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 300
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "catering": {
    "manifestVersion": "2.0",
    "businessType": "catering",
    "displayName": "Catering",
    "description": "Full-service catering company with services overview, event gallery, testimonials, and contact / quote form. Lead-generation focused.",
    "defaultStyle": "hearth",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Company Name",
        "hint": "Your catering company name.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Unforgettable events, exceptional food.\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Company",
        "hint": "What events you cater, how many guests, experience, accolades.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": true,
        "label": "Phone Number",
        "hint": "Primary contact for booking inquiries.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": true,
        "label": "Email",
        "hint": "Primary email for quotes and contracts.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Image",
        "hint": "A beautiful event or dish shot. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "e.g. #1a3a2e for an elegant forest green.",
        "wizardStep": 6
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Sample Menus / Packages",
        "hint": "Breakfast, lunch, dinner, cocktail hour packages.",
        "wizardStep": 5
      },
      {
        "field": "specials",
        "type": "schedule",
        "required": false,
        "label": "Services Offered",
        "hint": "Wedding, corporate, private dining, festivals, etc.",
        "wizardStep": 5
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Event photography drives catering leads.",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "specials"
        ],
        "sections": [
          {
            "id": "cat-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.45,
                  "ctaLabel": "Get a Quote",
                  "ctaHref": "/contact"
                }
              }
            ]
          },
          {
            "id": "cat-services",
            "name": "Services",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-services",
                "type": "specials",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "cat-testimonials",
            "name": "Testimonials",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-testimonials",
                "type": "testimonials",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "cat-gallery",
            "name": "Gallery",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-gallery",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 3
                }
              }
            ]
          },
          {
            "id": "cat-cta",
            "name": "Get a Quote CTA",
            "order": 4,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-cta",
                "type": "cta",
                "order": 0,
                "visible": true,
                "config": {
                  "label": "Request a Quote",
                  "href": "/contact"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "services",
        "path": "/services",
        "title": "Services",
        "optional": false,
        "usesSlots": [
          "specials",
          "menu"
        ],
        "sections": [
          {
            "id": "cat-svc-list",
            "name": "What We Offer",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-svc-list",
                "type": "specials",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "cat-svc-menus",
            "name": "Sample Menus",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-svc-menus",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": false
                }
              }
            ]
          }
        ]
      },
      {
        "id": "gallery",
        "path": "/gallery",
        "title": "Gallery",
        "optional": false,
        "usesSlots": [],
        "sections": [
          {
            "id": "cat-gallery-full",
            "name": "Event Gallery",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-gallery-full",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 3
                }
              }
            ]
          }
        ]
      },
      {
        "id": "testimonials",
        "path": "/testimonials",
        "title": "Testimonials",
        "optional": true,
        "usesSlots": [],
        "sections": [
          {
            "id": "cat-testimonials-full",
            "name": "Client Reviews",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-testimonials-full",
                "type": "testimonials",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "cat-about",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-about",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact & Quote",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email"
        ],
        "sections": [
          {
            "id": "cat-contact",
            "name": "Get in Touch",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-cat-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-cat-quote",
                "type": "cta",
                "order": 1,
                "visible": true,
                "config": {
                  "label": "Email Us for a Quote",
                  "href": "mailto:"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "food-stand": {
    "manifestVersion": "2.0",
    "businessType": "food-stand",
    "displayName": "Food Stand",
    "description": "Market stall, pop-up, or permanent food stand. Minimal pages: home with menu and location, a full menu page, and contact.",
    "defaultStyle": "ember",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Stand Name",
        "hint": "Your stand's name — short and memorable.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Fresh tamales every Saturday.\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Stand",
        "hint": "What you sell, where you're found, your story.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone / Text Number",
        "hint": "For pre-orders and inquiries.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "Optional contact email.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo / Banner Art",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Photo",
        "hint": "Your stand or food. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "e.g. #e84e2a for a vibrant street-food feel.",
        "wizardStep": 6
      },
      {
        "field": "locations",
        "type": "location",
        "required": false,
        "label": "Location & Hours",
        "hint": "Market location, days, and hours.",
        "wizardStep": 4
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Menu",
        "hint": "Your items. Keep it short — stands do best with focused menus.",
        "wizardStep": 5
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Optional — good for map visibility.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "menu",
          "locations"
        ],
        "sections": [
          {
            "id": "fs-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.35,
                  "ctaLabel": "See the Menu",
                  "ctaHref": "/menu"
                }
              }
            ]
          },
          {
            "id": "fs-menu",
            "name": "Menu Preview",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 2,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "fs-hours",
            "name": "Find Us",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-fs-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 280
                }
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "fs-menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "location",
        "path": "/location",
        "title": "Location",
        "optional": false,
        "usesSlots": [
          "locations"
        ],
        "sections": [
          {
            "id": "fs-location",
            "name": "Where to Find Us",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-location-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-fs-location-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 400
                }
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email"
        ],
        "sections": [
          {
            "id": "fs-contact",
            "name": "Contact",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-fs-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      }
    ]
  },
  "food-truck": {
    "manifestVersion": "2.0",
    "businessType": "food-truck",
    "displayName": "Food Truck",
    "description": "Mobile food business with rotating schedule, daily location updates, menu, gallery, and social feed. Optimised for Instagram and Google Maps.",
    "defaultStyle": "ember",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Truck Name",
        "hint": "The name on the side of your truck.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Seoul food, street speed\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Truck",
        "hint": "What you serve, your story, your vibe.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone / Text Number",
        "hint": "Guests can text for catering inquiries.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "Catering and event booking contact.",
        "wizardStep": 1
      },
      {
        "field": "business.cuisineType",
        "type": "text",
        "required": false,
        "label": "Cuisine Type",
        "hint": "e.g. Korean BBQ, Tacos, Vegan Bowls.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo / Truck Art",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Photo",
        "hint": "Your truck in action. Minimum 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "Hex code e.g. #e84e2a.",
        "wizardStep": 6
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Menu",
        "hint": "Add your rotating menu items.",
        "wizardStep": 5
      },
      {
        "field": "events",
        "type": "schedule",
        "required": false,
        "label": "Weekly Schedule / Stops",
        "hint": "Where you'll be this week — market, lot, event.",
        "wizardStep": 4
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Your truck's Instagram — key for discovery.",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.tiktok",
        "type": "text",
        "required": false,
        "label": "TikTok URL",
        "hint": "Short-form video is huge for food trucks.",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Your Google Maps listing.",
        "wizardStep": 3
      },
      {
        "field": "social.doordash",
        "type": "text",
        "required": false,
        "label": "DoorDash URL",
        "hint": "Optional delivery link.",
        "wizardStep": 3
      },
      {
        "field": "social.ubereats",
        "type": "text",
        "required": false,
        "label": "Uber Eats URL",
        "hint": "Optional delivery link.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "hint": "Appears in browser tabs and search results.",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "branding.logoUrl",
          "events",
          "social.instagram"
        ],
        "sections": [
          {
            "id": "ft-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.4,
                  "ctaLabel": "See Where We Are",
                  "ctaHref": "/schedule"
                }
              }
            ]
          },
          {
            "id": "ft-schedule",
            "name": "This Week",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-sched",
                "type": "events-list",
                "order": 0,
                "visible": true,
                "config": {
                  "maxItems": 5,
                  "label": "Where We'll Be"
                }
              }
            ]
          },
          {
            "id": "ft-menu",
            "name": "Menu Preview",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 2,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "ft-social",
            "name": "Social Feed",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 9
                }
              }
            ]
          },
          {
            "id": "ft-delivery",
            "name": "Order Online",
            "order": 4,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-delivery",
                "type": "delivery-links",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "ft-menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "schedule",
        "path": "/schedule",
        "title": "Schedule",
        "optional": false,
        "usesSlots": [
          "events"
        ],
        "sections": [
          {
            "id": "ft-sched-full",
            "name": "Full Schedule",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-sched-full",
                "type": "events-list",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-ft-sched-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 360
                }
              }
            ]
          }
        ]
      },
      {
        "id": "gallery",
        "path": "/gallery",
        "title": "Gallery",
        "optional": true,
        "usesSlots": [],
        "sections": [
          {
            "id": "ft-gallery",
            "name": "Photo Gallery",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-gallery",
                "type": "gallery",
                "order": 0,
                "visible": true,
                "config": {
                  "columns": 3
                }
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email"
        ],
        "sections": [
          {
            "id": "ft-contact",
            "name": "Contact",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-ft-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-ft-cta",
                "type": "cta",
                "order": 1,
                "visible": true,
                "config": {
                  "label": "Book Us for Your Event",
                  "href": "mailto:"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "ghost-kitchen": {
    "manifestVersion": "2.0",
    "businessType": "ghost-kitchen",
    "displayName": "Ghost Kitchen",
    "description": "Delivery-only or virtual restaurant. Landing page focused on ordering CTAs, delivery platform links, menu, and brand story.",
    "defaultStyle": "canvas",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Brand Name",
        "hint": "The name customers see on DoorDash, Uber Eats, etc.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "e.g. \"Restaurant quality. Delivery speed.\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Brand",
        "hint": "What you make, why it's great, your concept.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone / Text",
        "hint": "Optional — mainly for catering inquiries.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email",
        "hint": "For catering and wholesale.",
        "wizardStep": 1
      },
      {
        "field": "business.cuisineType",
        "type": "text",
        "required": false,
        "label": "Cuisine Type",
        "hint": "e.g. Smash Burgers, Vegan Wings, Ramen.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Photo",
        "hint": "Your best food photography. Min 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "Bold colors perform well for delivery brands. e.g. #e63946.",
        "wizardStep": 6
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Menu",
        "hint": "Your full delivery menu.",
        "wizardStep": 5
      },
      {
        "field": "social.doordash",
        "type": "text",
        "required": false,
        "label": "DoorDash URL",
        "hint": "Your most important link — add it.",
        "wizardStep": 3
      },
      {
        "field": "social.ubereats",
        "type": "text",
        "required": false,
        "label": "Uber Eats URL",
        "hint": "Second most important.",
        "wizardStep": 3
      },
      {
        "field": "social.grubhub",
        "type": "text",
        "required": false,
        "label": "Grubhub URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.chownow",
        "type": "text",
        "required": false,
        "label": "ChowNow URL",
        "hint": "Good for direct, commission-free orders.",
        "wizardStep": 3
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "Food content + delivery links = strong acquisition funnel.",
        "wizardStep": 3
      },
      {
        "field": "social.tiktok",
        "type": "text",
        "required": false,
        "label": "TikTok URL",
        "hint": "Viral food content drives delivery orders.",
        "wizardStep": 3
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "social.doordash",
          "social.ubereats",
          "social.grubhub",
          "social.chownow"
        ],
        "sections": [
          {
            "id": "gk-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.4,
                  "ctaLabel": "Order Now",
                  "ctaHref": "/order"
                }
              }
            ]
          },
          {
            "id": "gk-delivery",
            "name": "Order Online",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-delivery",
                "type": "delivery-links",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "gk-menu",
            "name": "Menu Preview",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-menu",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 3,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "gk-social",
            "name": "Social Feed",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu"
        ],
        "sections": [
          {
            "id": "gk-menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "order",
        "path": "/order",
        "title": "Order",
        "optional": false,
        "usesSlots": [
          "social.doordash",
          "social.ubereats",
          "social.grubhub",
          "social.chownow"
        ],
        "sections": [
          {
            "id": "gk-order",
            "name": "Where to Order",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-delivery-full",
                "type": "delivery-links",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-gk-order-cta",
                "type": "cta",
                "order": 1,
                "visible": true,
                "config": {
                  "label": "View Full Menu",
                  "href": "/menu"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "gk-about",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-about",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.phone",
          "business.email"
        ],
        "sections": [
          {
            "id": "gk-contact",
            "name": "Contact",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-gk-contact",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      }
    ]
  },
  "restaurant": {
    "manifestVersion": "2.0",
    "businessType": "restaurant",
    "displayName": "Restaurant",
    "description": "Full-service dine-in restaurant with multi-page site: hero, full menu, location & hours, about story, reservations, events, blog, and press.",
    "defaultStyle": "hearth",
    "compatibleStyles": [
      "hearth",
      "canvas",
      "midnight",
      "market",
      "coast",
      "ember"
    ],
    "slots": [
      {
        "field": "business.name",
        "type": "text",
        "required": true,
        "label": "Restaurant Name",
        "hint": "The name your guests know you by.",
        "wizardStep": 1
      },
      {
        "field": "business.tagline",
        "type": "text",
        "required": false,
        "label": "Tagline",
        "hint": "A short phrase that captures your vibe. e.g. \"Farm to table since 1998\"",
        "wizardStep": 1
      },
      {
        "field": "business.description",
        "type": "richtext",
        "required": true,
        "label": "About Your Restaurant",
        "hint": "Tell guests who you are, what you serve, and what makes you special.",
        "wizardStep": 1
      },
      {
        "field": "business.phone",
        "type": "text",
        "required": false,
        "label": "Phone Number",
        "hint": "Your main contact number.",
        "wizardStep": 1
      },
      {
        "field": "business.email",
        "type": "text",
        "required": false,
        "label": "Email Address",
        "hint": "Contact email shown on your website.",
        "wizardStep": 1
      },
      {
        "field": "business.cuisineType",
        "type": "text",
        "required": false,
        "label": "Cuisine Type",
        "hint": "e.g. Italian, Mexican, American Comfort Food.",
        "wizardStep": 1
      },
      {
        "field": "branding.logoUrl",
        "type": "image",
        "required": false,
        "label": "Logo",
        "hint": "PNG or SVG. Minimum 512x512.",
        "wizardStep": 6
      },
      {
        "field": "branding.heroImageUrl",
        "type": "image",
        "required": false,
        "label": "Hero Image",
        "hint": "Full-width banner. Minimum 1600x900.",
        "wizardStep": 6
      },
      {
        "field": "branding.primaryColor",
        "type": "text",
        "required": false,
        "label": "Primary Brand Color",
        "hint": "Hex code e.g. #2a4a2e.",
        "wizardStep": 6
      },
      {
        "field": "locations",
        "type": "location",
        "required": false,
        "label": "Location & Hours",
        "hint": "Street address, city, state, ZIP, Google Maps URL.",
        "wizardStep": 4
      },
      {
        "field": "menu",
        "type": "menu",
        "required": false,
        "label": "Menu",
        "hint": "Add categories and items. Photos and dietary tags supported.",
        "wizardStep": 5
      },
      {
        "field": "social.instagram",
        "type": "text",
        "required": false,
        "label": "Instagram URL",
        "hint": "e.g. https://instagram.com/yourrestaurant",
        "wizardStep": 3
      },
      {
        "field": "social.facebook",
        "type": "text",
        "required": false,
        "label": "Facebook Page URL",
        "hint": "e.g. https://facebook.com/yourrestaurant",
        "wizardStep": 3
      },
      {
        "field": "social.googleBusiness",
        "type": "text",
        "required": false,
        "label": "Google Business Profile",
        "hint": "Your Google Maps listing URL.",
        "wizardStep": 3
      },
      {
        "field": "social.yelp",
        "type": "text",
        "required": false,
        "label": "Yelp Listing URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.doordash",
        "type": "text",
        "required": false,
        "label": "DoorDash URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.ubereats",
        "type": "text",
        "required": false,
        "label": "Uber Eats URL",
        "hint": "Optional.",
        "wizardStep": 3
      },
      {
        "field": "social.opentable",
        "type": "text",
        "required": false,
        "label": "OpenTable URL",
        "hint": "Reservation link shown on the site.",
        "wizardStep": 3
      },
      {
        "field": "events",
        "type": "schedule",
        "required": false,
        "label": "Events",
        "hint": "Upcoming dining events, wine nights, live music, etc.",
        "wizardStep": 8
      },
      {
        "field": "seo.siteTitle",
        "type": "text",
        "required": false,
        "label": "Site Title (SEO)",
        "hint": "Appears in browser tabs and search results.",
        "wizardStep": 7
      },
      {
        "field": "seo.metaDescription",
        "type": "text",
        "required": false,
        "label": "Meta Description (SEO)",
        "hint": "Max 160 characters.",
        "wizardStep": 7
      }
    ],
    "pages": [
      {
        "id": "home",
        "path": "/",
        "title": "Home",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.tagline",
          "branding.heroImageUrl",
          "branding.logoUrl",
          "menu",
          "social.instagram",
          "social.facebook",
          "social.googleBusiness",
          "social.opentable"
        ],
        "sections": [
          {
            "id": "home-hero",
            "name": "Hero",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-hero",
                "type": "hero",
                "order": 0,
                "visible": true,
                "config": {
                  "overlayOpacity": 0.45,
                  "ctaLabel": "View Menu",
                  "ctaHref": "/menu"
                }
              }
            ]
          },
          {
            "id": "home-menu",
            "name": "Menu Preview",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-menu-prev",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 3,
                  "showPrices": true
                }
              }
            ]
          },
          {
            "id": "home-hours",
            "name": "Hours",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "home-social",
            "name": "Social Feed",
            "order": 3,
            "visible": true,
            "blocks": [
              {
                "id": "b-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          },
          {
            "id": "home-delivery",
            "name": "Delivery Links",
            "order": 4,
            "visible": true,
            "blocks": [
              {
                "id": "b-delivery",
                "type": "delivery-links",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "home-map",
            "name": "Map",
            "order": 5,
            "visible": true,
            "blocks": [
              {
                "id": "b-map",
                "type": "map",
                "order": 0,
                "visible": true,
                "config": {
                  "height": 360
                }
              }
            ]
          }
        ]
      },
      {
        "id": "menu",
        "path": "/menu",
        "title": "Menu",
        "optional": false,
        "usesSlots": [
          "menu",
          "business.name"
        ],
        "sections": [
          {
            "id": "menu-full",
            "name": "Full Menu",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-menu-full",
                "type": "menu-preview",
                "order": 0,
                "visible": true,
                "config": {
                  "maxCategories": 99,
                  "showPrices": true
                }
              }
            ]
          }
        ]
      },
      {
        "id": "hours-location",
        "path": "/hours",
        "title": "Hours & Location",
        "optional": false,
        "usesSlots": [
          "locations",
          "business.phone"
        ],
        "sections": [
          {
            "id": "hl-hours",
            "name": "Hours",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-hl-hours",
                "type": "hours",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "hl-map",
            "name": "Map",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-hl-map",
                "type": "map",
                "order": 0,
                "visible": true,
                "config": {
                  "height": 400
                }
              }
            ]
          }
        ]
      },
      {
        "id": "about",
        "path": "/about",
        "title": "About",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.description",
          "branding.logoUrl"
        ],
        "sections": [
          {
            "id": "about-text",
            "name": "Our Story",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-about-text",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "about-press",
            "name": "Press",
            "order": 1,
            "visible": true,
            "blocks": [
              {
                "id": "b-about-press",
                "type": "press",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          },
          {
            "id": "about-social",
            "name": "Social Links",
            "order": 2,
            "visible": true,
            "blocks": [
              {
                "id": "b-about-social",
                "type": "social-feed",
                "order": 0,
                "visible": true,
                "config": {
                  "platform": "instagram",
                  "count": 6
                }
              }
            ]
          }
        ]
      },
      {
        "id": "contact",
        "path": "/contact",
        "title": "Contact",
        "optional": false,
        "usesSlots": [
          "business.name",
          "business.phone",
          "business.email",
          "locations"
        ],
        "sections": [
          {
            "id": "contact-info",
            "name": "Contact Info",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-contact-info",
                "type": "text",
                "order": 0,
                "visible": true,
                "config": {}
              },
              {
                "id": "b-contact-map",
                "type": "map",
                "order": 1,
                "visible": true,
                "config": {
                  "height": 320
                }
              }
            ]
          }
        ]
      },
      {
        "id": "reservations",
        "path": "/reservations",
        "title": "Reservations",
        "optional": true,
        "usesSlots": [
          "social.opentable"
        ],
        "sections": [
          {
            "id": "res-widget",
            "name": "Booking Widget",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-res-widget",
                "type": "reservation-widget",
                "order": 0,
                "visible": true,
                "config": {
                  "provider": "opentable"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "events",
        "path": "/events",
        "title": "Events",
        "optional": true,
        "usesSlots": [
          "events"
        ],
        "sections": [
          {
            "id": "events-list",
            "name": "Events",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-events",
                "type": "events-list",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      },
      {
        "id": "blog",
        "path": "/blog",
        "title": "Blog",
        "optional": true,
        "usesSlots": [
          "blog"
        ],
        "sections": [
          {
            "id": "blog-list",
            "name": "Blog Posts",
            "order": 0,
            "visible": true,
            "blocks": [
              {
                "id": "b-blog",
                "type": "blog-list",
                "order": 0,
                "visible": true,
                "config": {}
              }
            ]
          }
        ]
      }
    ]
  }
} as Record<string, TemplateManifest>;

export function getTemplateManifest(businessType: BusinessType | string): TemplateManifest | undefined {
  return BUILTIN_TEMPLATES[businessType];
}

export const TEMPLATE_NAMES: Array<{ id: BusinessType; name: string; description: string; icon: string; defaultStyle: string }> = [
  { id: 'restaurant', name: 'Dine-In Restaurant', description: 'Full-service restaurant with multi-page menu, reservations & private dining', icon: 'restaurant', defaultStyle: 'hearth' },
  { id: 'bakery', name: 'Artisan Bakery', description: 'Pastry shop & patisserie with pre-orders, daily bakes & cake gallery', icon: 'bakery_dining', defaultStyle: 'market' },
  { id: 'cafe', name: 'Specialty Cafe', description: 'Third-wave coffeehouse, espresso bar & light breakfast fare', icon: 'local_cafe', defaultStyle: 'canvas' },
  { id: 'bar', name: 'Craft Bar & Taphouse', description: 'Cocktail lounge, craft beer tap list & late-night bar bites', icon: 'local_bar', defaultStyle: 'midnight' },
  { id: 'food-truck', name: 'Street Food Truck', description: 'Mobile truck with live location tracker, schedule stops & fast ordering', icon: 'local_shipping', defaultStyle: 'ember' },
  { id: 'catering', name: 'Catering & Events', description: 'Banquets, corporate catering, package menus & quote inquiries', icon: 'dinner_dining', defaultStyle: 'coast' },
  { id: 'ghost-kitchen', name: 'Virtual Ghost Kitchen', description: 'Multi-concept delivery-only kitchen with DoorDash & UberEats integration', icon: 'delivery_dining', defaultStyle: 'midnight' },
  { id: 'food-stand', name: 'Quick-Service Food Stand', description: 'Fast casual counter service, boardwalk stand or food hall stall', icon: 'fastfood', defaultStyle: 'market' },
];
