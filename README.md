# CloudMC Shop - Smart Shopping List

A modern, intelligent shopping list web application designed for shop.cloudmc.online with AI-powered features to optimize your shopping experience.

**Repository:** https://github.com/SirJBiscuit/shoppingWebserver

## Features

### 🛒 Smart Shopping Lists
- Create and manage multiple shopping lists
- Auto-organize items by category
- Real-time cost calculation
- Check off items as you shop

### 🧠 Intelligent Suggestions
- **Recurring Items**: Automatically suggests items based on purchase frequency
- **Low Inventory Alerts**: Notifies when items are running low
- **Purchase History**: Learns your shopping patterns over time
- **Smart Search**: Quick search with autocomplete from your history

### 📦 Inventory Tracking
- Track current stock levels with percentage indicators
- Visual progress bars for quick assessment
- Update inventory levels manually
- Last purchase date tracking

### 📊 Shopping Analytics
- Purchase history and statistics
- Average days between purchases
- Preferred quantities and units
- Cost tracking and trends

### 🔒 Secure Authentication
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting for API protection

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** for authentication
- **bcrypt** for password security
- **Helmet** for security headers
- **Rate limiting** for DDoS protection

### Frontend
- **React** 18
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **date-fns** for date formatting

### Infrastructure
- **Docker** & Docker Compose
- **Nginx** for frontend serving
- **PostgreSQL** containerized database

## Quick Start

### For Linux (Debian Bookworm 12) - Production Deployment

**See [LINUX-QUICKSTART.md](LINUX-QUICKSTART.md) for fast deployment on your dedicated server.**

Full deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

### For Windows/Local Development

#### Prerequisites
- Docker and Docker Compose installed
- Git (optional)

#### Installation

1. Clone or navigate to the project directory:
```bash
cd c:/Users/Jeremiah Payne/CascadeProjects/shopWebserver
```

2. Create a `.env` file from the example:
```bash
copy .env.example .env
```

3. Edit `.env` and set secure values:
```env
DB_PASSWORD=your-secure-database-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production
```

4. Build and start the containers:
```bash
docker-compose up -d --build
```

5. Run database migrations:
```bash
docker exec shop_backend npm run migrate
```

6. Access the application:
- Frontend: http://localhost:3006
- Backend API: http://localhost:3001
- For Cloudflare Tunnel: Point to localhost:3006

## Cloudflare Tunnel Setup

Since you mentioned you already have a Cloudflare tunnel set up:

1. Configure your tunnel to point to `localhost:3000`
2. Set the hostname to `shop.cloudmc.online`
3. The application will be accessible at https://shop.cloudmc.online

Example tunnel config:
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: shop.cloudmc.online
    service: http://localhost:3006
  - service: http_status:404
```

## Development

### Running in Development Mode

Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm start
```

### Environment Variables

**Backend (.env)**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Backend port (default: 3001)

**Frontend**:
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:3001)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Shopping Lists
- `GET /api/shopping/lists` - Get all lists
- `GET /api/shopping/lists/:id` - Get specific list
- `POST /api/shopping/lists` - Create new list
- `POST /api/shopping/lists/:id/items` - Add item to list
- `PATCH /api/shopping/lists/:listId/items/:itemId` - Update item
- `DELETE /api/shopping/lists/:listId/items/:itemId` - Delete item
- `POST /api/shopping/lists/:id/complete` - Complete shopping trip

### Suggestions
- `GET /api/suggestions/smart-suggestions` - Get AI suggestions
- `GET /api/suggestions/search?q=query` - Search items

### Inventory
- `GET /api/inventory` - Get inventory
- `PATCH /api/inventory/:itemId` - Update inventory
- `GET /api/inventory/history` - Get purchase history
- `GET /api/inventory/statistics` - Get statistics

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts
- `profiles` - User profiles for different shopping contexts
- `items` - Master item catalog
- `shopping_lists` - Shopping list metadata
- `shopping_list_items` - Items in shopping lists
- `purchase_history` - Historical purchase data
- `inventory` - Current inventory levels
- `item_statistics` - Purchase patterns and analytics

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token authentication (7-day expiry)
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS protection
- SQL injection prevention (parameterized queries)
- Input validation with express-validator

## Future Enhancements

- [ ] Meal planning integration
- [ ] Recipe suggestions based on inventory
- [ ] Barcode scanning
- [ ] Price comparison across stores
- [ ] Shared shopping lists
- [ ] Mobile app (React Native)
- [ ] Voice input for adding items
- [ ] Export shopping lists to PDF
- [ ] Integration with grocery delivery services

## Troubleshooting

### Database Connection Issues
```bash
docker-compose logs postgres
docker exec -it shop_postgres psql -U shopuser -d shopdb
```

### Backend Issues
```bash
docker-compose logs backend
docker exec -it shop_backend npm run migrate
```

### Frontend Issues
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### Reset Everything
```bash
docker-compose down -v
docker-compose up -d --build
docker exec shop_backend npm run migrate
```

## License

Private project for cloudmc.online

## Support

For issues or questions, contact the development team.
