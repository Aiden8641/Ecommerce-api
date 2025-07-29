### Overview
---
An Ecommerce api built with typescript and express. Featuring payment processing with stripe, authentication, product management.

---
### Features
- JWT with Refresh tokens: Access tokens and refresh tokens are provided on sign in/sign up. Allowing users to continue their session without having to reauthenticate every so often as long as they have a valid refresh token.
- Caching: Data such as products that have recently been searched for or the users carts are cached with redis allowing for swift retreival of items that are frequently requested
- Stripe: Safe and secure payment processing with stripe
- Product management: Admin users can create, update, or delete products.

---
### Usage 

clone the repo:
```

```

open directory: 
```
cd ./Ecommerce-api
```

install dependencies: 
```
npm i 
```

configure envrionment variables
```
JWT_SECRET=your_secret
JWT_ISSUER=your_issuer
JWT_AUDIENCE=your_audience

// uses redis cloud
REDIS_DB_PASSWORD=your_redis_password

// project uses supabase for postgres
DATABASE_URL=your_db_password

STRIPE_API_KEY=your_stripe_api_key
```

run project locally
```
npm run dev
```

run tests
```
npm run test
```
