#!/usr/bin/python3
#
# validate_trees.py: A Python script for testing the topologies generated for
# all topology testing.
#
# The testing we do here is pretty simple: we report on the number of topologies
# generated in the 'n*' directories in the parent directory and on whether the
# Nexus file contains any duplicates. If the number of topologies is the expected
# number, each topology contains the expected number of leaf nodes, and there are
# no duplicates, then we can be sure that we have generated all topologies correctly.
#
# In order to test that this script itself works, we include a 'duplicates.nex'
# file in the current directory. This file is based on n3/trees.nex, which we
# expect to contain 15 binary trees and 11 multifurcating trees. This modified
# version of the file includes some duplicate topologies to ensure that we can
# detect them.
#

# We use the dendropy library to load Nexus files and do comparisons of trees.
import dendropy

# Calculate the unweighted Robinson-Foulds distance between two trees. This is
# defined as the number of partitions implied by the first tree but not the
# second (A) + the number of partitions implied by the second tree but not the
# first (B). This is an integer, which should be zero if the two trees represent
# the same evolutionary hypothesis.
#
# See https://dendropy.org/library/treecompare.html#dendropy.calculate.treecompare.symmetric_difference
# for more details.
def tree_diff(t1, t2):
  return dendropy.calculate.treecompare.symmetric_difference(
    t1,
    t2
  )

# Helper method to test if two trees are identical.
def is_identical(t1, t2):
  return tree_diff(t1, t2) == 0

# Test whether the provided tree is bifurcating.
def is_bifurcating(tree):
  def does_node_have_two_children(node):
    return (
      # Is this a leaf node?
      len(node.child_nodes()) == 0 or
      # If not, does all of this node's children have
      # exactly two children or is a leaf node itself?
      (len(node.child_nodes()) == 2 and
      filter(does_node_have_two_children, node.child_nodes()))
    )

  return len(list(filter(does_node_have_two_children, tree.nodes()))) == len(tree.nodes())

# Validate the provided NEXUS file. This includes:
#   - Counting the number of total trees, bifurcating and multifurcating trees
#     in the Nexus file.
#   - Comparing every tree to every other tree to ensure that they are not identical.
def validateNexusFile(nexusFilePath):
  # All trees must share the same taxon namespace so that they can be compared.
  taxa = dendropy.TaxonNamespace()

  # Load trees.
  trees = dendropy.TreeList.get(path=nexusFilePath, schema="nexus", taxon_namespace=taxa)

  # Load
  bifurcating_trees = list(tree for tree in trees if is_bifurcating(tree))
  multifurcating_trees = list(tree for tree in trees if not is_bifurcating(tree))
  print(f"Loaded {len(trees)} ({len(bifurcating_trees)} bifurcating, {len(multifurcating_trees)} multifurcating) trees from {nexusFilePath} with taxon namespace {taxa} ({len(taxa)} taxa).")

  # Are all trees unique? If not, which ones are duplicates?
  duplicate_count = 0
  for index1, t1 in enumerate(trees, start=1):
    for index2, t2 in enumerate(trees, start=1):
      t1.encode_bipartitions()
      t2.encode_bipartitions()
      if t1 != t2:
        if is_identical(t1, t2):
          print(f"Duplicate found: {t1} ({index1}) is identical to {t2} ({index2}): {tree_diff(t1, t2)}")
          duplicate_count += 1
        else:
          # print(f"Duplicate not found: {t1} ({index1}) is different from {t2} ({index2}): {tree_diff(t1, t2)}")
          continue
  if duplicate_count == 0:
    print(f"No duplicates found in {nexusFilePath}.")
  else:
    print(f"WARNING: {duplicate_count} duplicates found in {nexusFilePath}.")

for n in range(3, 7):
  validateNexusFile(f"../n{n}/trees.nex")
