# Lacuna

![License: MIT](https://img.shields.io/badge/license-MIT-green)

---

## Problem

About 99% of ancient Greek literature has been lost to history. For example:

- Of the 123 plays Sophocles wrote, we have 7.
- Of Aeschylus's roughly 90 plays, we have 7.
- Of Euripides's ~90 plays, we have 19.
- Aristotle is thought to have written around 200 works. We have about 31.

For many lost works, their existence is solely known or understood through reference and allusion. And by flagging when works are quoted, paraphrased, or alluded to, scholars are able to construct profiles that most accurately convey the essence of the work. 

As of now, however, the process of doing so still requires much manual sifting and interpretation. No method currently exists to easily navigate or visualize the works holistically, known or lost.

## Solution

Lacuna performs lost work profile construction and provides an aesthetic interactive knowledge graph that contains both regular and 'ghost' nodes linked by citation reference.

The interactive knowledge graph functions as a library. Information generated within a ghost node is always linked to its original reference and dispositionally conservative in order to avoid hallucination and compounding drift. 

Unlike static fragment collections compiled manually by individual scholars, Lacuna dynamically synthesizes references across the corpus into living profiles.

