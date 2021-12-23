# Interactive board

- [x] Drag to color cells
  - [ ] Don't allow branching; break old connections
- [x] Implement basic push algorithm
  - [x] Implement double layer pushing
  - [ ] Implement backtracking to reconnect in pushed layers

# Board class

- [ ] Embed connections in the data (not just cell colors with inferred connections)
- [ ] Implement path simplification (eg round off 4-square loops, 3-hex triangles)

# Algorithm notes

## Board state validity checks

- [x] Detect when two isolated areas contain tails that can't connect

  - Colors on the perimeter must connect without crossing other lines

    - If two colors are next to each other on the perimeter, you can "cancel" them out
    - If there is a singlet color on the perimeter, with a matching island in the same area, you can "cancel" it out
    - If a color can connect in one area, remove all requirements of that color from other areas

- [x] Detect areas that cannot be filled because all available tails go through other areas
  - This is done as a sub-task of isolated area detection

## A\* search heuristics

- [ ] Move along edges
- [ ] Keep channel gaps consistent
  - [ ] Cling to the wall by default
  - [ ] Gain 1 distance from the wall if we pass by an endpoint that then must come along in this direction to get around us
  - [ ] Keep gaps around endpoints (requires nuance, this varies a lot)
- [ ] Go around endpoints
  - I really am not sure how to mathematically represent this yet.
- [ ] Heuristics for selecting which colors to solve or partially solve first
  - [ ] Measure of expected commplexity from edges (eg distance from islands to closest current edge)
  - [ ] Nodes that can close along just the edge
  - [ ] Nodes that can almost close (eg passing just one other node)
  - [ ] If other tail is a different distance from the wall, move ~away because we _must_ wrap around some other node (# of nodes to wrap around = the difference in wall distance, ish)
- [ ] Minimize: Simple A\* search distance between all corresponding (other?) tails
  - This should help reduce preference to cut tails off from each other, and instead go around them
    - Should there be 'modes' of search? Different strategies to try one after another? (around vs straight through)
    - Explore if I can use this to create 'untangles' by going around islands
- [ ] Move toward large open spaces, which need to be filled

## Example puzzles

Wrap around

- hex 9x9 level 105
  - Cyan wraps around yellow, then yellow does 1-gap past blue
- hex 9x9 level 111
  - Red has long single channel with Cyan
- hex 9x9 level 117
  - Cyan and brown untangle with each other

Wall spacing

- grid 9x9 level 118 brown, cyan, blue

- hex 9x9 level 106
  - Green wraps around red
- hex 9x9 level 108
  - Pink has two islands both 1 away from the wall
- hex 9x9 level 111
  - Purple has two islands both 1 away from the wall, with red endpoint in part of it
- hex 9x9 level 112
  - Pink 1-away plus complex red 1-away
- hex 9x9 level 114
  - Cyan giving space for blue, then blue has 2 choices one of which gives enough space for red to get out. Trick wall spacing issue with orange until it can wall-crawl.
- hex 9x9 level 116
  - Very short purple 1-space wall connection in top right
  - Purple giving orange space on left edge
- hex 9x9 level 122
  - has a very long orange 1-space wall connection giving space for yellow
- hex 9x9 level 144
  - Has a 1-space and 2-space path on orange
- hex 10x10 level 2
  - Has a 2-choice spot with purple, where it must leave enough space for all of maroon, red, orange to get out
- hex 10x10 level 9 has a complex island spacing problem with yellow going around blue and orange

Multiple techniques

- grid 7x7 level 23
  - generally tricky. Lots of islands.
- grid 7x7 level 52
  - almost entirely islands
- grid 7x7 level 54
- grid 7x7 level 55
- grid 8x8 level 48
- grid 8x8 level 78
- grid 8x8 level 89
- grid 9x9 level 123
- grid 9x9 level 127
- grid 10x10 level 23
- grid 10x10 level 53
- grid 10x10 level 63

- hex 9x9 level 146
  - Green has a 1-space wall and a wraparound

## Open questions

- Is there a way to cluster moves together into approaches, so invalidating one can invalidate several? eg invalidating the straightforward path and indicating that you must go around an endpoint
- Can I use multiple-cell-wide paths to fill a path and squish them smaller as other paths fill the area next to them?

## Topology approach

Can I generate a simplified graph of possible paths of 'going around' islands?

Abstract from the actual spatial requirements, find valid graphs, then try the possibilities, prioritized via heuristics
Asked [on discord](https://discord.com/channels/713475280219537500/713489039000338483/921484565221109820):

> "Does anyone know what field of math would have the most to say about solving this kind of puzzle? There's a concept around some paths having to "go around" some of the islands on one side or the other to untangle overlaps that I'm having a really hard time figuring out how to represent in a solver, esp marrying it with actual spacial constraints for how many paths can go through a channel. It feels like there should be some way to generate a simplified graph that captures that, or something.
>
> One very useful thing would be being able to determine which partial solutions are equivalent in terms of which paths have gone around which islands, so a given branch of an A\* search can explore all of just one topology(?) to find actual paths. Then if I can generate all the possible topologies regardless of actual spatial constraints I could search among those w/ heuristics
>
> Currently the closest I have is just identifying the ordering of any outer perimeters (which lets me resolve trivial impossibilities when doing on-the-grid searching, when I fully cut off one area from another) but that's just a special case of this general thing"

Other example levels to play with:

- grid 8x8 level 7

(discussing grid 10x10 level 23)

```
CccccccccN
cOoggggGcn
ccOgcccccn
RcCGcnnnnn
rkKccnrrrr
rkYCRNrBbr
rkyyrrrYbr
rkByyyyybr
rKbbbbbbbr
rrrrrrrrrr
```

Important properties of each of the paths visible there:

- one type goes from an outside edge to an island, eg red/brown
- one type goes from an island to another
- one type goes from the island to itself — must wrap around some of the other items from that island Cyan MUST go around [orange, green] or around [pink, yellow], or [red, brown] or any two of those sets; one possibility for each pair of sides cyan is exposed on (3, here)
- since pink shares an island with blue, if cyan goes around pink it must also go around blue
- since pink-blue-yellow have an island chain with adjacent positions, they must be a closed loop with nothing else inside that's part of those islands (but a separate closed network inside that loop would be valid)

So not counting space constraints, these alternate topologies (someone please correct me if I'm using that word wrong) would be valid:

- Cyan could instead wrap around the pink-blue-yellow cycle
- Red could come out the other side of the island and connect with the edge

But not:

- Cyan could not wrap around orange+red in any combination because brown/red are not loops; can't go around their other ends
- Pink/blue/yellow could not wrap around the other end of the pink/yellow island because it would need to wrap around red and brown

So I think that's really only like 4 total topologies, from combinations of those first two variants.

Not sure how to account for bits like: on the pink/blue island, pink could come out the right and blue could come out the left and wrap around pink. I think in this case that's equivalent because it's just a 2-island and in this abstracted topology you can just rotate those freely?

Some attempts at how one could represent this graph:
Island: OOGKYCRBRCYKCO (from top clockwise, double-counting both sides of pink, cyan, red)
Island: BY
Island: BK
Island: G
Perimeter: RB

O1 -> O2
O2 -> O1
G1 -> G2
K1 <-> K2;B1 <-> B2;Y2 <-> Y1
// Y1; part of above loop
C1 <-> C2 [contains O,G]
R1 <-> R2
// B1 Part of above loop
R2 <-> R1
C2 <-> C1
// Y2 Part of above loop
K
C
O
