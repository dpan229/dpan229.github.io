# Hi

This is the repository for my website, hosted via Github Pages.

The live site is available here: [dpan229.github.io](https://dpan229.github.io)

# Web apps

## [Word Former](https://dpan229.github.io/wordformer/)

This is an interactive app where you form words from their constituent letters. 
Add letters to the field by clicking the buttons or typing on your keyboard. 
Words attract each other if they can combine to form a single longer word, and combine when they collide. 
Pairs that cannot form a valid word combine into unstable words, which decay over time. 
The bottom of the page contains a list of all of the unique words formed sorted by length.

Word list source: [https://github.com/dwyl/english-words](https://github.com/dwyl/english-words)

## [Markov Text](https://dpan229.github.io/markovtext/)

This app parses whatever text you enter into a Markov chain and allows you to generate humorous pseudotext from it. 
The app first splits the text into elements, which can be either words or individual characters. 
Then it creates the Markov chain by viewing the text through a sliding multi-element context window: each state represents a fixed-length sequence of elements in the text and 
the transitions between these are based on the transitions seen in the text.
A longer context window will produce text closer to the original.

The app displays a visual representation of the Markov chain at the top, showing each state as a node and each transition as an arrow between nodes.

## [Ants](https://dpan229.github.io/ants/)

This is a simulation of a large number of "ants" in a 2D space. 
Each ant places trails as it moves and follows existing trails, which it sees by sampling 5 points in an arc in front of itself.
The behavior of each individual ant is simple, but in large numbers they exhibit emergent collective behaviors. 

The app allows you to place trails by clicking in the field and has controls for varying the parameters of the ants' behavior.

## [Vaneck Sequence Explorer](https://dpan229.github.io/vaneck/)

This is an interactive app for exploring the [Van Eck Sequence](https://oeis.org/A181391). The sequence begins with 0, then continues as follows: each number in the sequence is equal to the distance between the previous number in the sequence and the last occurance of that number, or 0 if this is the first time that number has appeared. Thus, the second number is 0 (the first element was the first occurance of 0), the third number is 1 (the last time 0 appeared was 1 step earlier), the fourth number is 0 (that was the first appearance of 1), the fifth number is 2 (the last time 0 appeared was 2 steps earlier), and so on.

As you pan and zoom, elements of the sequence are automatically generated to fill the view. 
Mouse over an element to see the two elements its value is referencing, and click on it to zoom them both into view.

## [Image Sorter](https://dpan229.github.io/imagesorter/)

This is an app that "sorts" the pixels of an image in 2D. 
Each pixel is given a target position based on its color, and every frame a subset of the pixels attempt to swap positions with a random neighbor.
The pixels will only perform the swap if doing so would reduce the total loss: the sum of the square of each pixel's distance from its target position. 

The X and Y components of the target calculation can be set independently, allowing many possible combinations.

## [Turmites](https://dpan229.github.io/turmites/)

A turmite is a two-dimensional analogue of a Turing machine: rather than a one-dimensional tape, a turmite interacts with a two-dimensional tape. 
Like a Turing machines, a turmite has an internal state and takes actions based on a combination of this state and the symbol below it on the tape.

This app offers a customizable simulation of a turmite. 
The turmite's ruleset can be freely edited, resulting in a wide range of possible behaviors.

There are two main types of turmites: relative turmites, which have an internal orientation and whose actions are relative to this orientation, and absolute termites, whose actions move them in absolute directions. Currently, only relative actions are implemented.