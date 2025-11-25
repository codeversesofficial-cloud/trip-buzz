// Script to add dummy company pages to Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Firebase config - update with your credentials
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const companyPages = [
    {
        title: "Explore",
        slug: "explore",
        content: `Welcome to TripBuzz Explorer!

Discover Amazing Destinations

At TripBuzz, we curate the finest travel experiences across India. From serene farmhouses to luxurious resorts, we bring you handpicked destinations that promise unforgettable memories.

Our Selection Process
- Personally verified locations
- Quality assured accommodations  
- Authentic local experiences
- Safety and comfort prioritized

Start exploring today and find your perfect getaway!`,
    },
    {
        title: "Why Choose Us",
        slug: "why-choose-us",
        content: `Why TripBuzz is Your Perfect Travel Partner

Best-in-Class Properties
We partner only with premium properties that meet our strict quality standards. Every farmhouse, resort, and staycation is personally inspected to ensure exceptional experiences.

Unmatched Service
- 24/7 customer support
- Easy booking process
- Flexible cancellation policies
- Verified reviews from real travelers

Competitive Pricing
Get the best value for your money with our competitive rates and exclusive deals.

Trust & Safety
Your safety is our priority. All our properties are verified and meet safety standards.`,
    },
    {
        title: "About Us",
        slug: "about-us",
        content: `About TripBuzz

Who We Are
TripBuzz is India's premier platform for discovering and booking extraordinary travel experiences. Founded with a passion for travel and a commitment to quality, we connect travelers with the best farmhouses, resorts, and staycation properties across the country.

Our Mission
To make exceptional travel experiences accessible to everyone by curating the finest properties and providing seamless booking services.

Our Vision
To become India's most trusted travel platform, known for quality, reliability, and customer satisfaction.

What We Offer
- Handpicked properties
- Verified reviews
- Best price guarantee
- Personalized travel experiences

Starting from Hyderabad, we're expanding across India to bring you more amazing destinations!`,
    },
    {
        title: "Help Center",
        slug: "help-center",
        content: `TripBuzz Help Center

How Can We Help You Today?

Booking Questions
Q: How do I book a trip?
A: Simply browse our trips, click "Book Now" on your chosen destination, fill in traveler details, and complete the payment.

Q: Can I cancel my booking?
A: Yes, cancellation policies vary by property. Check the specific policy on the trip details page.

Payment Information
Q: What payment methods do you accept?
A: We accept all major credit/debit cards, UPI, and Cash on Delivery for select bookings.

Q: Is my payment secure?
A: Absolutely! We use industry-standard encryption to protect your payment information.

Need More Help?
Contact us at:
- Email: contact@tripbuzz.in
- Phone: +91 7997-7887-13

Our support team is available 24/7 to assist you!`,
    },
    {
        title: "List a Property",
        slug: "list-property",
        content: `List Your Property on TripBuzz

Grow Your Business with Us!

Are you a property owner looking to reach more customers? Partner with TripBuzz and showcase your farmhouse, resort, or staycation property to thousands of potential guests.

Why List With Us?
- Wide Reach: Access to a growing customer base
- Premium Exposure: Featured listings on our platform
- Marketing Support: Professional photography and listing optimization
- Easy Management: Simple dashboard to manage bookings
- Fair Commission: Competitive rates with transparent pricing

Requirements
- Legal property ownership
- Quality accommodations
- Safety compliance
- Professional service standards

How to Get Started
1. Fill out the partnership form
2. Property verification and inspection
3. Professional photography (we can help!)
4. Go live and start receiving bookings

Ready to Partner?
Contact us at: contact@tripbuzz.in
Call us at: +91 7997-7887-13

Let's grow together!`,
    },
];

async function addPages() {
    console.log("Adding company pages to Firebase...");

    for (const page of companyPages) {
        try {
            await addDoc(collection(db, "company_pages"), page);
            console.log(`✓ Added page: ${page.title}`);
        } catch (error) {
            console.error(`✗ Failed to add ${page.title}:`, error);
        }
    }

    console.log("Done!");
    process.exit(0);
}

addPages();
