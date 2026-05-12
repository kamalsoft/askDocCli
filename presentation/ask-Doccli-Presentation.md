---
title: askDocCli Technical Overview
theme: white
 
revealOptions:
  transition: 'fade'               # Transition style: none/fade/slide/convex/concave/zoom
  transitionSpeed: 'default'       # Transition speed: default/fast/slow
  backgroundTransition: 'fade'     # Transition style for full page slide backgrounds
  autoSlide: 5000                  # Delay in ms between auto-sliding
  autoSlideStoppable: true         # Stop auto-sliding after user input
  center: true                     # Vertical centering of slides
  controls: true                   # Display presentation control arrows
  controlsTutorial: true           # Help user learn controls with hints
  controlsLayout: 'bottom-right'    # Determines where controls appear
  progress: true                   # Display a presentation progress bar
  slideNumber: 'c/t'               # Display slide numbers (current/total)
  showSlideNumber: 'all'           # Show slide numbers on all views
  hash: true                       # Add current slide to URL hash
  keyboard: true                   # Enable keyboard shortcuts for navigation
  overview: true                   # Enable slide overview mode (Esc)
  touch: true                      # Enable touch navigation on mobile
  help: true                       # Show help screen when '?' is pressed
  hideInactiveCursor: true         # Hide mouse cursor after seconds of inactivity
  width: 1200                      # Base width for the presentation
  height: 900                      # Base height for the presentation
  margin: 0.1                      # Margin around the content
  minScale: 0.2                    # Minimum scaling factor
  maxScale: 2.0                    # Maximum scaling factor
---
<!-- .slide: data-background-color="#8347AD" -->
# **ask-DocCli**
 Markdown to Conversational Intelligence

---
<!-- .slide: data-background-color="#8347AD" -->
## **The Local-First Vision**
![alt text](image-3.png)
---
1. 100% local performance optimized engine
2. Zero cloud dependencies or SaaS
3. No telemetry or external data leaks
4. Privacy-first RAG pipeline architecture
5. Air-gapped environment ready

<!-- .slide: data-background-color="#8347AD" -->
---
<!-- .slide: data-background-color="#8347AD" -->
![alt text](image-6.png)
---
<!-- .slide: data-background-color="#8347AD" -->
## **Primary Use Cases**
---
1. **Onboarding**: Instant architectural context for engineers
2. **Compliance**: Secure cross-referencing of internal policies
3. **Support**: Real-time triage using technical manuals
4. **Remote**: Intelligence for offline field operations
<!-- .slide: data-background-color="#8347AD" -->
---
<!-- .slide: data-background-color="#8347AD" -->
## **Technical Model Architecture**
---
* Standardized 4-bit quantized ONNX models
* Strictly structured directory hierarchy
* Low-footprint embedding and reasoning weights
<!-- .slide: data-background-color="#8347AD" -->
---
<!-- .slide: data-background-color="#8347AD" -->
## **CLI Interface & Workflow**
---
1. `ingest`: Build local vector store
2. `ingest --force`: Rebuild from scratch
3. `ask`: Query the intelligence engine
4. `ask --debug`: Inspect scores and citations
<!-- .slide: data-background-color="#8347AD" -->
---
<!-- .slide: data-background-color="#8347AD" -->
![alt text](image-4.png)

---
![alt text](image-5.png)
<!-- .slide: data-background-color="#8347AD" -->
