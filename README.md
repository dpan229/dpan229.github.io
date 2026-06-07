# Hi

This is the repository for my website, hosted via Github Pages.

The live site is available here: 

# Web apps

## Word Former

This is an interactive app where you form words from their constituent letters. Add letters to the field by clicking the buttons or typing on your keyboard. Words attract each other if they can combine to form a single longer word, and combine when they collide. Pairs that cannot form a valid word combine into unstable words, which decay over time. The bottom of the page has a list of all of the unique words formed, ordered by length then alphabetically.

Word list source: [https://github.com/dwyl/english-words](https://github.com/dwyl/english-words)

## Markov Text

This is an app that parses whatever text you enter into a Markov chain and allows you to generate humorous pseudotext from it. The text is split into elements, either words or individual characters, and each state in the Markov chain is a sequence of these elements: a multi-word or multi-character context window containing the last elements seen. A longer context window will produce text closer to the original.

The app displays a visible representation of the Markov chain at the top, showing each state as a node and each transition as an arrow between nodes.

## Ants

This is a simulation of a large number of "ants" in a looping 2D space. On every frame, each ant places a trail at its current position and samples 5 points in an arc in front of itself to determine how much to turn. The amount that the ant turns is a weighted average of the amount of trails at the sampled points plus a set weight assigned to a random angle to make its movements nondeterministic. The behavior of each individual ant is relatively simple but in large numbers emergent collective behaviors appear. 

The app allows you to place trails by clicking in the field and has controls for varying the paramters of the ants' behavior.

## Vaneck Sequence Explorer

This is an interactive app for exploring the [Van Eck Sequence](https://oeis.org/A181391). The sequence begins with 0, then continues as follows: each number in the sequence is equal to the distance between the previous number in the sequence and the last occurance of that number, or 0 if this is the first time that number has appeared. Thus, the second number is 0 (the first element was the first occurance of 0), the third number is 1 (the last time 0 appeared was 1 step earlier), the fourth number is 0 (that was the first appearance of 1), the fifth number is 2 (the last time 0 appeared was 2 steps earlier), and so on.

Use the scroll wheel to zoom in and out. Click and drag to move the view horizontally. Elements of the sequence are generated automatically to fill the view. Mouse over an element to see the two elements its value is referencing, and click on it to zoom them both into view.