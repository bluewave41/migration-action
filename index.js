const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs").promises;
const axios = require("axios");
const simpleGit = require("simple-git");

const git = simpleGit();

async function start() {
  // the main folder contains our repo code
  const path = core.getInput("path"); //path to the folder to watch
  //const path = "server";
  const repoFiles = await fs.readdir(path);
  //const payload = JSON.parse(await fs.readFile("event.json"));
  const event = github.context.payload;
  const pushUrl = event.pull_request.base.repo.clone_url.replace(
    "//",
    `//Starmaker-bot:${process.env.TOKEN}@`
  );

  const commitsUrl = event.repository.commits_url.replace(
    "{/sha}",
    "/" + github.context.sha
  );

  const commits = await axios.get(commitsUrl);
  const commitFiles = commits.data.files.map((file) =>
    file.filename.split("/").at(-1)
  );

  let currentHighestMigration = getHighestMigration(repoFiles);
  const highestCommitMigration = getHighestMigration(commitFiles);

  if (highestCommitMigration <= currentHighestMigration) {
    await git.checkout(github.context.base_ref);
    for (const file of commitFiles) {
      const newName = file.split("_");
      newName[0] = pad(++currentHighestMigration, 4, "0");
      await git.mv(`${path}/${file}`, `${path}/${newName.join("_")}`);
    }
    await git.add(".");
    await git.commit("Update migration IDs");
    await git.push(pushUrl, github.context.base_ref);
  }
}

start();

function pad(str, length, c) {
  let s = str.toString();
  while (s.length < length) {
    s = c + s;
  }
  return s;
}

function getHighestMigration(names) {
  return names
    .map((el) => parseInt(el))
    .sort()
    .at(-1);
}

/*try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput("who-to-greet");
  console.log(`Hello ${nameToGreet}!`);
  const time = new Date().toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}*/
