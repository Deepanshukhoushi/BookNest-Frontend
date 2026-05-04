# BookNest Frontend

![Angular](https://img.shields.io/badge/Angular-21-dd0031.svg?style=flat&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-007acc.svg?style=flat&logo=typescript)
![Node](https://img.shields.io/badge/Node.js->=18-43853d.svg?style=flat&logo=node.js)
![Quality Gate](https://img.shields.io/badge/SonarQube-Quality%20Gate-success?logo=sonarqube)

This is the frontend web application for the BookNest project. It provides a modern, responsive, and dynamic user interface for the BookNest e-commerce platform and administrative management tools.

## 🌟 Key Features

- **User Storefront**: Browse books, view detailed information, and manage shopping carts seamlessly.
- **Admin Dashboard**: Comprehensive inventory management, sales tracking, and interactive data visualizations.
- **Dynamic Theming**: Premium dark-themed UI components for an immersive user experience.
- **Secure Authentication**: JWT-based secure routing and protected API communications.
- **Interactive Visualizations**: Real-time sales and performance charts using Chart.js.

## 🚀 Technology Stack

- **Language**: TypeScript
- **Framework**: Angular 21
- **Styling**: CSS
- **Testing**: Vitest (Unit Testing) & Angular Testing Library
- **Code Quality**: SonarQube & Prettier
- **Charts**: Chart.js & ng2-charts
- **Package Manager**: npm

## 📁 Project Architecture

This application follows a modern, scalable Angular architecture using the `core`, `features`, `shared`, and `shell` structure:

```text
src/app/
├── core/         # Singleton services, interceptors, and application-wide models (e.g., Auth, Storage)
├── features/     # Feature-specific modules and components (e.g., Cart, Checkout, Admin Dashboard)
├── shared/       # Reusable UI components, directives, and pipes used across multiple features
└── shell/        # Layout components (Header, Footer, Navigation) and top-level routing
```

## ⚙️ Environment Setup

The application uses dynamic environment variable injection via `scripts/set-env.js`.

1. **Create an environment file**:
   Copy the `.env.example` file to create a new `.env` file in the root directory.
   ```bash
   cp .env.example .env
   ```

2. **Configure variables**:
   Populate the `.env` file with the required values. The following variables are supported:
   - `NG_APP_API_BASE_URL`: The base URL for the backend API (default: `http://localhost:8080/api/v1`)
   - `NG_APP_RAZORPAY_KEY`: Your Razorpay public key for payments
   - `NG_APP_TAX_RATE`: Default tax rate (default: `0.08`)
   - `NG_APP_SHIPPING_THRESHOLD`: Threshold for free shipping (default: `250`)
   - `NG_APP_BASE_SHIPPING`: Base shipping cost (default: `12.00`)
   - `NG_APP_DEFAULT_AVATAR`: Default user avatar URL
   - `SONAR_HOST_URL`: SonarQube server URL (default: `http://localhost:9000`)
   - `SONAR_TOKEN`: Your SonarQube authentication token

3. **Install dependencies**:
   ```bash
   npm install
   ```

## 🛠️ Development Server

To start the local development server, run:

```bash
npm start
```
*Note: This command automatically runs the `config` script to generate the `environment.ts` files before starting the Angular development server (`ng serve`).*

Once running, navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## 🐳 Docker Deployment

The application is fully containerized using a multi-stage Dockerfile (Node for building, Nginx for serving).

**1. Build the Docker Image:**
```bash
docker build -t booknest-frontend .
```

**2. Run the Container:**
```bash
docker run -p 80:80 booknest-frontend
```
The application will be accessible at `http://localhost`.

## 🧪 Testing and Quality Assurance

### Unit Testing (Vitest)
This project uses [Vitest](https://vitest.dev/) for fast and robust unit testing.

- **Run tests**: `npm run test`
- **Run tests with UI**: `npm run test:ui`
- **Generate coverage report**: `npm run test:coverage`

### Static Code Analysis (SonarQube)
Ensure you have SonarQube configured in your `.env` with `SONAR_HOST_URL` and `SONAR_TOKEN`.

- **Run Sonar Scanner**:
  ```bash
  npm run sonar
  ```

## ✨ Code Formatting

This project enforces strict code style using **Prettier**. The configuration is defined in `.prettierrc`.
To ensure consistency, please format your code before creating a pull request. If your IDE is not set to format on save, you can configure a format script or run prettier manually.

## 🏗️ Code Scaffolding

Generate a new component:
```bash
ng generate component component-name
```
For a complete list of available schematics:
```bash
ng generate --help
```

## 📦 Building for Production

To build the project for production environments:

```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory, optimized for performance and speed.

## 📝 Additional Resources
- [Angular Architecture Guide](https://angular.dev/guide/architecture)
- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Vitest Documentation](https://vitest.dev/guide/)
