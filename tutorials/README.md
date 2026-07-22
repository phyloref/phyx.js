# Tutorials

[![nbviewer](https://raw.githubusercontent.com/jupyter/design/master/logos/Badges/nbviewer_badge.svg)](https://nbviewer.jupyter.org/github/phyloref/phyx.js/tree/master/tutorials/)


This directory is intended to store multiple tutorials as executable [Jupyter Notebook]
files using [IJavascript] as a Node.js kernel. A [Makefile] is included that can be used
to build Markdown and PDF versions of these tutorials, using [Jupyter nbconvert] and
[pandoc]. We use the [eisvogel] LaTeX template as the template for our PDF.

While these Jupyter Notebooks can be viewed in [Jupyter nbviewer], note that they cannot
be opened with [Binder], since they use an unsupported IJavascript kernel (see [related issue]).

These notebooks are also published on the [phyx.js documentation site]. `tutorials/build.mjs`
stages them for that build; see the Docs section of [AGENTS.md] for how that works and what to
watch out for. Note that the Markdown files here are generated from the notebooks, so edit the
notebook rather than the Markdown.

Currently available tutorials:
- [Introduction.ipynb] - An introduction to phyx.js ([Introduction.md], [Introduction.pdf], [Introduction in nbviewer])


  [phyx.js documentation site]: https://www.phyloref.org/phyx.js/
  [AGENTS.md]: ../AGENTS.md
  [Jupyter Notebook]: https://jupyter.org/
  [IJavascript]: https://github.com/n-riesco/ijavascript
  [Makefile]: ./Makefile
  [Jupyter nbconvert]: https://nbconvert.readthedocs.io/
  [pandoc]: https://pandoc.org/
  [eisvogel]: https://github.com/Wandmalfarbe/pandoc-latex-template/
  [Jupyter nbviewer]: https://nbviewer.jupyter.org/github/phyloref/phyx.js/tree/master/tutorials/
  [Binder]: https://mybinder.org/
  [related issue]: https://github.com/phyloref/phyx.js/issues/105
  [Introduction.ipynb]: ./Introduction.ipynb
  [Introduction.md]: ./Introduction.md
  [Introduction.pdf]: ./Introduction.pdf
  [Introduction in nbviewer]: https://nbviewer.jupyter.org/github/phyloref/phyx.js/tree/master/tutorials/Introduction.ipynb
