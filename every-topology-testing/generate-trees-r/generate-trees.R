# install.packages('phytools');
require('phytools');

# Using allFurcTrees.
LEAF_COUNT = 5;
all_trees = allFurcTrees(LEAF_COUNT);
write.tree(all_trees, paste("all_trees_", LEAF_COUNT, ".txt", sep=""));
plot(all_trees);

# Using multi2di.
trees <- do.call(c, lapply(1:1000, function(x) multi2di(starTree(LETTERS[1:LEAF_COUNT]))))
uniqueTrees <- unique.multiPhylo(trees)
length(uniqueTrees);
write.tree(uniqueTrees, paste("all_trees_", LEAF_COUNT, ".txt", sep=""));

coaltrees <- do.call(c, lapply(1:1000, function(x) rtree(LEAF_COUNT)))
uniqueCoalTrees <- unique.multiPhylo(coaltrees)
length(uniqueCoalTrees);
plot(uniqueCoalTrees[3]);
