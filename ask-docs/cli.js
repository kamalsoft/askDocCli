#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { ingestDocs } from "./ingest.js";
import { clearCache } from "./cache.js";
import { askDocs } from "./ask.js";
import { runTUI } from "./tui.js";
import { openPanelUI } from "./panel.js";

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
   Cache management
------------------------------------------------------- */
program
  .command("clear-cache")
  .description("Clear the ingestion cache to force a full rebuild of embeddings")
  .action(() => {
    const success = clearCache();
    if (success) {
      console.log(chalk.green("✨ Ingestion cache cleared successfully."));
    } else {
      console.log(chalk.yellow("ℹ️  No cache file found to clear."));
    }
  });

  /* -------------------------------------------------------
   Benchmark command
  ------------------------------------------------------- */
  program
  .command('benchmark')
  .description('Run accuracy benchmarks against the documentation set')
  .option('-f, --file <file>', 'Specify a ground-truth JSON file for benchmarks', 'benchmarks.json')
  .action(async (opts) => {
    const benchmarkFile = path.resolve(opts.file);
    console.log(chalk.cyan(`\n🚀 Running benchmarks from: ${benchmarkFile}`));

    if (!fs.existsSync(benchmarkFile)) {
      console.error(chalk.red(`❌ Benchmark file not found: ${benchmarkFile}`));
      process.exitCode = 1;
      return;
    }

    let benchmarks;
    try {
      benchmarks = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));
    } catch (err) {
      console.error(chalk.red(`❌ Failed to parse benchmark file: ${err.message}`));
      process.exitCode = 1;
      return;
    }

    let totalTests = benchmarks.length;
    let passedTests = 0;
    let totalConfidence = 0;

    for (const [index, benchmark] of benchmarks.entries()) {
      console.log(chalk.blue(`\n--- Test ${index + 1}/${totalTests}: "${benchmark.question}" ---`));
      try {
        const startTest = performance.now();
        const { answer, citations, confidence, fallback } = await askDocs(benchmark.question);
        const endTest = performance.now();
        const latency = ((endTest - startTest) / 1000).toFixed(2);

        totalConfidence += confidence;
        let citationMatch = true;
        if (benchmark.expectedCitations && benchmark.expectedCitations.length > 0) {
          // Normalize actual citations to "filename :: Heading" for comparison
          const actualCitationStrings = citations.map(c => {
            const parts = c.split(' :: ');
            return `${parts[0]} :: ${parts[1].replace(/"/g, '')}`; // Remove quotes from heading
          });
          for (const expected of benchmark.expectedCitations) {
            if (!actualCitationStrings.some(ac => ac.includes(expected))) {
              citationMatch = false;
              break;
            }
          }
        }

        let answerKeywordMatch = true;
        if (benchmark.expectedAnswerKeywords && benchmark.expectedAnswerKeywords.length > 0) {
          const lowerCaseAnswer = answer.toLowerCase();
          for (const keyword of benchmark.expectedAnswerKeywords) {
            if (!lowerCaseAnswer.includes(keyword.toLowerCase())) {
              answerKeywordMatch = false;
              break;
            }
          }
        }

        if (citationMatch && answerKeywordMatch) {
          console.log(chalk.green(`✅ Passed (${latency}s, Confidence: ${confidence.toFixed(3)})`));
          passedTests++;
        } else {
          console.log(chalk.red(`❌ Failed (${latency}s, Confidence: ${confidence.toFixed(3)})`));
          if (fallback) console.log(chalk.gray('  ⚠️ Model entered fallback mode (RAG ignored)'));
          console.log(chalk.yellow('  Expected Citations:'), benchmark.expectedCitations);
          console.log(chalk.yellow('  Actual Citations:'), citations);
          console.log(chalk.yellow('  Expected Keywords:'), benchmark.expectedAnswerKeywords);
          console.log(chalk.yellow('  Actual Answer:'), answer);
        }
      } catch (err) {
        console.error(chalk.red(`  ❌ Error during askDocs for "${benchmark.question}": ${err.message}`));
      }
    }

    console.log(chalk.cyan(`\n--- Benchmark Summary ---`));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    if (passedTests === totalTests) {
      console.log(chalk.green('🎉 All benchmarks passed!'));
    } else {
      console.log(chalk.red('⚠️ Some benchmarks failed.'));
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

/* -------------------------------------------------------
   TUI command
------------------------------------------------------- */
program
  .command("tui")
  .description("Launch an interactive Terminal User Interface")
  .action(async () => {
    await runTUI();
  });

/* -------------------------------------------------------
   Panel command
------------------------------------------------------- */
program
  .command("panel")
  .description("Launch the side-by-side dashboard TUI")
  .action(async () => {
    await openPanelUI();
  });

program.parse(process.argv);
