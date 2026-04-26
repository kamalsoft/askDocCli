#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { performance } from "perf_hooks";
import { ingestDocs } from "./ingest.js";
import { askDocs } from "./ask.js";

const program = new Command();

program
  .name("ask-docs")
  .description("Local, config-driven documentation QA CLI")
  .version("0.1.0");

/* -------------------------------------------------------
   Ingest command
------------------------------------------------------- */
program
  .command("ingest")
  .description("Ingest documentation into the local vector store")
  .option("-f, --force", "Force rebuild of all embeddings")
  .option("-d, --debug", "Enable verbose debug logging")
  .action(async (opts) => {
    const force = !!opts.force;
    const debug = !!opts.debug;

    const start = performance.now();
    console.log(
      chalk.cyan(
        `\n🚀 Starting ingest (force=${force}, debug=${debug})`
      )
    );

    try {
      await ingestDocs({ force, debug });
      const end = performance.now();
      const seconds = ((end - start) / 1000).toFixed(2);

      console.log(chalk.green(`⏱  Ingest completed in ${seconds}s\n`));
    } catch (err) {
      console.error(chalk.red("\n❌ Ingest failed:"), err.message || err);
      process.exitCode = 1;
    }
  });

/* -------------------------------------------------------
   Ask command
------------------------------------------------------- */
program
  .command("ask <question>")
  .description("Ask a question against the ingested documentation")
  .option("-d, --debug", "Enable debug logging and timing")
  .action(async (question, opts) => {
    const debug = !!opts.debug;
    const start = performance.now();

    if (debug) {
      console.log(chalk.cyan(`\n❓ Question: ${question}\n`));
    }

    try {
      const { answer, citations } = await askDocs(question);

      console.log(chalk.yellow.bold("\n🧠 Answer:\n"));
      console.log(answer);

      if (citations && citations.length > 0) {
        console.log(chalk.magenta("\n📎 Citations:"));
        for (const c of citations) {
          console.log(" - " + c);
        }
      }

      const end = performance.now();
      const seconds = ((end - start) / 1000).toFixed(2);

      if (debug) {
        console.log(chalk.gray(`\n⏱  Answered in ${seconds}s\n`));
      } else {
        console.log(chalk.gray(`\n⏱  ${seconds}s\n`));
      }
    } catch (err) {
      console.error(chalk.red("\n❌ Ask failed:"), err.message || err);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
