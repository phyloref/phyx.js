# Tutorials in this directory are stored in the Jupyter Notebook (.ipynb)
# format. This Makefile converts them into two other formats for use in
# other media:
#   1. It converts this file into a Markdown file using jupyter-nbconvert.
#   2. It then converts the Markdown file into a PDF using pandoc.

PANDOC=pandoc
NBCONVERT=jupyter-nbconvert

NOTEBOOKS=$(wildcard *.ipynb)
MDFILES=$(NOTEBOOKS:%.ipynb=%.md)
PDFFILES=$(NOTEBOOKS:%.ipynb=%.pdf)

all: $(PDFFILES) $(MDFILES)
.PHONY: all clean
clean:
	rm $(MDFILES) $(PDFFILES)
	rm -f eisvogel.tex

# We download eisvogel.tex from 
eisvogel.tex:
	curl https://raw.githubusercontent.com/Wandmalfarbe/pandoc-latex-template/master/eisvogel.tex -o eisvogel.tex

%.pdf:%.md eisvogel.tex
	$(PANDOC) $< --output $@ --template eisvogel.tex --listings

%.md:%.ipynb
	$(NBCONVERT) $< --output $@ --to markdown

