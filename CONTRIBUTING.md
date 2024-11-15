# Contributing to Winter Code Fest

Thank you for being here!

The Winter Code Fest is meant to be a fun community project, and you are now a part of it!

Head over to the [GitHub Issues](https://github.com/dalurness/winter-code-fest/issues) to look for something you are interested in working on. When you are ready to work on an issue leave a comment on it stating your intention to work on it, and then go ahead and get started. We will assign you to the ticket when we get around to it (GitHub does not let you immediately assign yourself to it).

In the case of this repository, we are iterating very quickly, and the issues are generally pretty small. That said, we will expect a PR within a couple days of being assigned to the issue. If something comes up and it is taking a while, there is a chance we will notify you and unassign the issue to keep things moving.

We are guided by the goals below for this project, so if your PR aligns with these goals then there is a good chance it will be accepted! Feel free to open up issues to highlight problems you find or ideas you have for improvements that merit discussion.

#### Project Goals

- Questions are easy and medium difficulty, encouraging creativity and learning
- Participants are encouraged to discuss questions and share their solutions

### Getting Started

Site start up:

1. make sure you have node installed
2. clone the repo
3. run `npm i` from the repo directory to install dependencies
4. run `npm run dev` to start the website locally
5. navigate to [localhost:4321/winter-code-fest](http://localhost:4321/winter-code-fest)
6. If some types aren't available such as from calls to `getCollection` you might have to run `npm run astro sync` manually to get those

### 🚀 Project Structure

In case you can't tell, we are using [Astro](https://astro.build/) for this project.

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── logo.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

### WCF Logical Organization

WCF is made up of one question per day for the month of December. You can find the page structure for a question in `/src/pages/day/[day]/index.astro`.

There are some dynamic parts to the page that you can read the Astro documentation on, but long story short the questions' text are in `/src/content/days`, the community solutions are in `/src/content/communitySolutions`, the dynamic components that verify answers are in `/src/components/solutions`, and the static resource files for the questions are in `/public/day`.

### 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro sync`      | Generate high fidelity types for collections     |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
