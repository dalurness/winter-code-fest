# Winter Code Fest 
Welcome to the coolest coding festival of the year!

## Introduction 
The Winter Code Fest was created as a way to encourage taking some time to try something new! The questions are (originally 😅) meant to be easy and medium difficulty so that they don't take up too much time. Instead, we encourage you to branch out and be creative while solving the puzzles. Maybe use a programming language you are not familiar with, or try to solve them in a unique way. We are even considering just keeping the same questions every year so that each time we return we try out something new. Some feats to date: 
- the first ten questions solved in excel
- one question solved completely in machine code


## Contributing 
We would love your help on this project! Whether you want to add a question, put a little more flair to the site styles, or modify a question to come to a more checkable solution, we appreciate the help. We are guided by the goals below for this project, so if your PR aligns with these goals then there is a good chance it will be accepted! Feel free to open up issues to highlight problems you find or ideas you have for improvements.

#### Project Goals
- Questions are easy and medium difficulty, encouraging creativity and learning
- Devs are encouraged to discuss questions and share their solutions

### Getting Started running the project 
Site start up:
1. make sure you have node installed
2. clone the repo
3. run `npm i` from the repo directory to install dependencies
4. run `npm run dev` to start the website locally
5. navigate to [localhost:4321](http://localhost:4321)

### 🚀 Project Structure

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

### 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
