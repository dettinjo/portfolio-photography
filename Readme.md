<!-- Improved compatibility of back to top link: See: [https://github.com/othneildrew/Best-README-Template/pull/73](https://github.com/othneildrew/Best-README-Template/pull/73) -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https_placeholder">
    <img src="public/favicon-photography-dark.svg" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Headless Photography Portfolio</h3>

  <p align="center">
    A professional photography portfolio built with Next.js, Strapi, and a complete client authentication system for private album approvals.
    <br />
    <a href="#about-the-project"><strong>Explore the Features »</strong></a>
    <br />
    <br />
    <!-- <a href="https_placeholder">View Demo</a> -->
    ·
    <a href="[https://github.com/dettinjo/portfolio_frontend/issues/new?labels=bug&template=bug-report---.md](https://github.com/dettinjo/portfolio_frontend/issues/new?labels=bug&template=bug-report---.md)">Report Bug</a>
    ·
    <a href="[https://github.com/dettinjo/portfolio_frontend/issues/new?labels=enhancement&template=feature-request---.md](https://github.com/dettinjo/portfolio_frontend/issues/new?labels=enhancement&template=feature-request---.md)">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#backend-setup-strapi">Backend Setup (Strapi)</a></li>
        <li><a href="#frontend-setup-nextjs">Frontend Setup (Next.js)</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https_placeholder)

This repository contains a full-stack personal photography portfolio. It is designed to showcase photo albums dynamically while providing a secure portal for clients to log in, review private galleries, and approve images for publication.

All content, from photo albums to testimonials, is managed through a flexible Strapi Headless CMS, allowing for easy updates without redeploying the frontend.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Features

* **Dynamic Content:** All albums, testimonials, and services are fetched from a Strapi backend.
* **Client Authentication:** A complete login/register system for clients using Strapi's user-permissions plugin.
* **Private Client Dashboard:** Logged-in clients can view albums assigned to them.
* **Image Approval Workflow:** A secure page (`/approve/[token]`) allows clients to select and approve specific photos for portfolio publication.
* **Testimonial Submission:** A dedicated form with reCAPTCHA allows clients and visitors to submit reviews.
* **Internationalization (i18n):** Full support for English (EN) and German (DE).
* **Dynamic Theming:** Light/Dark mode support that respects system preferences.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

This project is built with a modern, decoupled architecture using the latest industry-standard tools.

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Tailwind][TailwindCSS]][Tailwind-url]
* [![Strapi][Strapi.io]][Strapi-url]
* [![Vercel][Vercel]][Vercel-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running, you will need to set up both the backend (Strapi) and the frontend (Next.js) services.

### Prerequisites

Ensure you have the following software installed on your machine.
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* npm
    ```sh
    npm install npm@latest -g
    ```

### Backend Setup (Strapi)

The backend must be running first, as the frontend depends on its API. These instructions assume you are running them from the `/backend` directory of the original project.

1.  Navigate into the `backend` directory.
    ```sh
    cd backend
    ```
2.  Install NPM packages.
    ```sh
    npm install
    ```
3.  Build the Strapi admin panel.
    ```sh
    npm run build
    ```
4.  Start the Strapi development server (runs on `http://localhost:1337`).
    ```sh
    npm run develop
    ```
5.  **Admin Setup & Permissions:** Navigate to `http://localhost:1337/admin` to create your administrator account. Then, go to **Settings > Roles > Public** and grant `find`, `findOne`, and `create` permissions for the **Album**, **Testimonial**, and **users-permissions** content types.

### Frontend Setup (Next.js)

These instructions should be run from the root directory of this codebase.

1.  Install NPM packages.
    ```sh
    npm install
    ```
2.  Create an environment file. In the root directory, create a new file named `.env.local` and add the variables from `.env.example`. At a minimum, you must set:
    ```env
    NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337
    NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN=localhost:3000
    ```
3.  Start the Next.js development server (runs on `http://localhost:3000`).
    ```sh
    npm run dev
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Headless CMS integration with Strapi
- [x] Internationalization (EN/DE)
- [x] Dynamic Light/Dark mode theming
- [x] Client testimonial submission form
- [x] Secure image approval workflow
- [x] Client login and private dashboard
- [ ] Add a blog/articles section managed from Strapi
- [ ] Integrate a payment processor for print sales

See the [open issues](https://github.com/dettinjo/portfolio_frontend/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See the `LICENSE` file for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Project Link: [https://github.com/dettinjo/portfolio_frontend](https://github.com/dettinjo/portfolio_frontend)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

This project was made possible by these incredible tools and libraries.

* [shadcn/ui](https://ui.shadcn.com/)
* [next-intl](https://next-intl.dev/)
* [Framer Motion](https://www.framer.com/motion/)
* [Lucide React](https://lucide.dev/)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[issues-shield]: [https://img.shields.io/github/issues/dettinjo/portfolio_frontend.svg?style=for-the-badge](https://img.shields.io/github/issues/dettinjo/portfolio_frontend.svg?style=for-the-badge)
[issues-url]: [https://github.com/dettinjo/portfolio_frontend/issues](https://github.com/dettinjo/portfolio_frontend/issues)
[license-shield]: [https://img.shields.io/github/license/dettinjo/portfolio_frontend.svg?style=for-the-badge](https://img.shields.io/github/license/dettinjo/portfolio_frontend.svg?style=for-the-badge)
[license-url]: [https://github.com/dettinjo/portfolio_frontend/blob/main/LICENSE](https://github.com/dettinjo/portfolio_frontend/blob/main/LICENSE)
[product-screenshot]: public/images/avatar.png
[Next.js]: [https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
[Next-url]: [https://nextjs.org/](https://nextjs.org/)
[React.js]: [https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
[React-url]: [https://reactjs.org/](https://reactjs.org/)
[TypeScript]: [https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
[TypeScript-url]: [https://www.typescriptlang.org/](https://www.typescriptlang.org/)
[TailwindCSS]: [https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
[Tailwind-url]: [https://tailwindcss.com/](https://tailwindcss.com/)
[Strapi.io]: [https://img.shields.io/badge/Strapi-2E7EEA?style=for-the-badge&logo=strapi&logoColor=white](https://img.shields.io/badge/Strapi-2E7EEA?style=for-the-badge&logo=strapi&logoColor=white)
[Strapi-url]: [https://strapi.io/](https://strapi.io/)
[Vercel]: [https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
[Vercel-url]: [https://vercel.com/](https://vercel.com/)
