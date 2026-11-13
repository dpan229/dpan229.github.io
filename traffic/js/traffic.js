const elem = id => document.getElementById(id);
const canvas = elem("main_canvas");
const ctx = canvas.getContext("2d");

/**
 * Takes an object with r, g, and b properties that are integral values between
 * 0 and 255 inclusive and returns the corresponding color string consisting of
 * a "#" followed by 6 hexadecimal digits, like "#FF00FF".
 * @param {Object} c object with r, g, and b properties 
 * @returns {String}
 */
function color_string(c) {
    return `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;
}

// Returns minimum clearance to allow between cars in adjacent lanes depending 
// on the angle between them. Currently not used 
function get_clearance(lane1, lane2) {
    const x1 = lane1.end_node.x - lane1.start_node.x;
    const y1 = lane1.end_node.y - lane1.start_node.y;
    const x2 = lane2.end_node.x - lane2.start_node.x;
    const y2 = lane2.end_node.y - lane2.start_node.y;
    const theta = Math.acos(
        (x1 * x2 + y1 * y2) / Math.sqrt((x1*x1 + y1*y1) * (x2*x2 + y2*y2))
    );
    return 10 / Math.sin((Math.PI - theta) / 2);
}

/**
 * Object representing starts and/or ends of lanes
 */
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // map from nodes to lanes ending at this node
        this.lanes_before = new Map();
        // map from nodes to lanes starting at this node
        this.lanes_after = new Map();

        // map from nodes coming into this node
        // to sets of cars that plan to enter this node from that direction
        this.visitors = new Map();
    }

    /**
     * Returns a node that can be reached from this node by traversing
     * one lane, picked uniformly at random.
     * If there is no such node, returns null.
     */
    random_node_after() {
        if (this.lanes_after.size == 0) {
            return null;
        }
        const nodes = Array.from(this.lanes_after.keys());
        return nodes[Math.floor(Math.random() * nodes.length)];
    }

    /**
     * Returns a lane that starts at this node, picked uniformly at random.
     * If there is no such lane, returns null.
     */
    random_lane_after() {
        if (this.lanes_after.size == 0) {
            return null;
        }
        const lanes = Array.from(this.lanes_after.values());
        return lanes[Math.floor(Math.random() * lanes.length)];
    }
}

/**
 * Object representing a one-way lane between two nodes that cars can travel on
 */
class Lane {
    constructor(start_node, end_node) {
        this.start_node = start_node;
        this.end_node = end_node;
        start_node.lanes_after.set(end_node, this);
        end_node.lanes_before.set(start_node, this);
        end_node.visitors.set(start_node, new Set());
        this.priority = Math.random();
        // list of cars on lane, always ordered by position
        this.cars = [];
    }

    /**
     * Returns the index in my list of cars of a car on this lane 
     * at the given position. This is the same as the number of cars
     * on this lane with position less than the given position.
     * @param {Number} position 
     * @returns {Number} index
     */
    get_index(position) {
        for (let i = 0; i < this.cars.length; i++) {
            if (this.cars[i].position >= position) {
                return i;
            }
        }
        return this.cars.length;
    }

    /**
     * Adds a new car to this lane at the given position. Can take additional
     * arguments for car constructor.
     * @param {Number} position 
     * @param  {...any} args arguments for Car constructor
     * @returns {Car} the new car
     */
    add_new_car(position, ...args) {
        const car = new Car(this, position, ...args);
        this.end_node.visitors.get(this.start_node).add(car);
        const i = this.get_index(position);
        this.cars.splice(i, 0, car);
        return car;
    }

    /**
     * Returns the coordinates of the point on this lane `position` units after
     * the start.
     * @param {Number} position
     * @returns {Object} object with x and y properties  
     */
    get_coords(position) {
        throw new Error("Lane's abstract method 'get_coords' was called");
    }

    /**
     * Draws this lane to the given canvas drawing context.
     * @param {CanvasDrawingContext2D} ctx 
     * @param {String} color 
     * @param {Number} width 
     */
    draw(ctx, color="black", width=1) {
        throw new Error("Lane's abstract method 'draw' was called")
    }
}

/**
 * A lane that follows a straight line between two points
 */
class StraightLane extends Lane {
    constructor(start_node, end_node) {
        super(start_node, end_node);
        this.length = Math.sqrt(
            (start_node.x - end_node.x)**2 + (start_node.y - end_node.y)**2
        );
    }

    get_coords(position) {
        const comp = position / this.length;
        return {
            x: this.start_node.x + comp * (this.end_node.x - this.start_node.x),
            y: this.start_node.y + comp * (this.end_node.y - this.start_node.y)
        };
    }

    draw(ctx, color="black", width=1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(this.start_node.x, this.start_node.y);
        ctx.lineTo(this.end_node.x, this.end_node.y);
        ctx.stroke();
    }
}

/**
 * A lane that follows a circular arc between two points
 */
class ArcLane extends Lane {
    constructor(start_node, end_node, center_x, center_y, counterclockwise=false) {
        super(start_node, end_node);
        this.center_x = center_x;
        this.center_y = center_y;
        this.radius = Math.sqrt((center_x - start_node.x)**2 + (center_y - start_node.y)**2);
        this.theta0 = Math.atan2(start_node.y - center_y, start_node.x - center_x);
        this.theta1 = Math.atan2(end_node.y - center_y, end_node.x - center_x);
        this.counterclockwise = counterclockwise;
        if (counterclockwise) {
            // ensure theta1 < theta0
            if (this.theta0 <= this.theta1) {
                this.theta0 += 2 * Math.PI;
            }
        } else {
            // ensure theta1 > theta0
            if (this.theta1 <= this.theta0) {
                this.theta1 += 2 * Math.PI;
            }
        }
        this.length = this.radius * Math.abs(this.theta1 - this.theta0);
    }

    get_coords(position) {
        const comp = position / this.length;
        return {
            x: this.center_x + this.radius * Math.cos(this.theta0 + comp * (this.theta1 - this.theta0)),
            y: this.center_y + this.radius * Math.sin(this.theta0 + comp * (this.theta1 - this.theta0))
        };
    }

    draw(ctx, color="black", width=1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(this.center_x, this.center_y, this.radius, this.theta0, this.theta1, this.counterclockwise);
        ctx.stroke();
    }
}

class Car {
    constructor(lane, position, max_speed=3, max_accel=0.03125) {
        this.lane = lane;
        this.position = position;
        this.max_speed = max_speed;
        this.max_accel = max_accel;
        this.speed = 0;

        // Nodes on my current planned path, starting with the node at the
        // end of my current lane. This should never by empty
        this.path = [lane.end_node];

        // List of cars detected as obstacles last frame. This is currently
        // only used for display
        this.last_obstacles = [];

        // Number of consecutive frames at 0 speed.
        // This is used as tiebreaker in large intersections
        this.stopped_time = 0;

        // 0 = go to target at end of path (currently unimplemented)
        // 1 = wander indefinitely
        this.start_wandering();
    }

    set_target(node) {
        this.mode = 0;
        this.path.length = 1;
    }

    start_wandering() {
        this.mode = 1;
        this.path.length = 1;
        this.path[0] = this.lane.end_node;
        this.fill_wander();
    }

    /**
     * Adds the given node to this car's path. There must be a lane connecting
     * the end of this car's current path to the given node.
     * @param {Node} node 
     */
    add_to_path(node) {
        const prev_node = this.path.at(-1);
        node.visitors.get(prev_node).add(this);
        this.path.push(node);
    }

    /**
     * Adds random lanes to this car's path until it is long enough to guarantee
     * that obstacles will be detected in time to stop before it hits them
     */
    fill_wander() {
        // distance to next node
        const d = this.lane.length - this.position;
        // max speed at next node
        // adding factor of max accel to account for velocity stepping up
        // at lane end
        const v = Math.min(
            this.max_speed, 
            Math.sqrt(this.speed*this.speed + 2 * this.max_accel * d) + this.max_accel
        );
        // make path long enough that I could stop within the path
        // even at max attainable speed at next node
        // adding factor of v to account for max possible overshoot of lane end
        const min_length = d + v * v / (2 * this.max_accel) + v;
        let pd = this.path_distance();
        let node = this.path.at(-1);
        while (pd < min_length) {
            const next_node = node.random_node_after();
            if (next_node === null) {
                return;
            }
            this.add_to_path(next_node);
            pd += node.lanes_after.get(next_node).length;
            node = next_node;
        }
    }

    /**
     * Returns the minimum distance it would take for this car to stop
     * given its current speed and maximum acceleration.
     * @returns {Number} distance
     */
    stopping_distance() {
        return this.speed * this.speed / (2 * this.max_accel);
    }

    /**
     * Returns a list of the lanes on this car's planned path in the order they
     * will be traversed. This does not include the lane the car is
     * currently on.
     * @returns {Array<Lane>} list of lanes
     */
    path_lanes() {
        const out = [];
        for (let i = 0; i < this.path.length - 1; i++) {
            const node1 = this.path[i];
            const node2 = this.path[i + 1];
            out.push(node1.lanes_after.get(node2));
        }
        return out;
    }

    /**
     * Returns the total length of this car's planned path, including the
     * distance left to cover on its current lane.
     * @returns {Number} distance
     */
    path_distance() {
        if (this.path.length > 0) {
            let out = this.lane.length - this.position;
            for (const lane of this.path_lanes()) {
                out += lane.length;
            }
            return out;
        } else {
            return 0;
        }
    }

    /**
     * Returns the distance along this car's planned path from its current
     * position to the first time it reaches the node `node` coming directly
     * from the node `prev_node`. If this never happens, returns `Infinity`.
     * @param {Node} node 
     * @param {Node} prev_node 
     * @returns {Number}
     */
    distance_to(node, prev_node) {
        let out = -this.position;
        let path_prev = this.lane.start_node;
        for (const path_node of this.path) {
            out += path_prev.lanes_after.get(path_node).length;
            if (path_node === node && path_prev === prev_node) {
                return out;
            }
            path_prev = path_node;
        }
        return Infinity;
    }

    /**
     * Detects obstacles in front of this car and updates its speed accordingly.
     */
    update_speed() {
        const stop_distance = this.stopping_distance();
        let obstacle = this.position + this.path_distance();
        this.last_obstacles.length = 0;
        let found_obstacle = false;
        // search current lane
        const lane_index = this.lane.get_index(this.position);
        if (lane_index < this.lane.cars.length - 1) {
            const next_car = this.lane.cars[lane_index + 1];
            this.last_obstacles.push(next_car);
            obstacle = Math.min(obstacle, next_car.position - 10);
            found_obstacle = true;
        }

        // search nodes on path
        if (!found_obstacle) {
            let start_pos = 0;
            for (let i = 0; i < this.path.length; i++) {
                const search_node = this.path[i];
                const search_lane = i == 0 ? this.lane : search_node.lanes_before.get(this.path[i - 1]);

                // search lane before node
                if (i != 0) {
                    if (search_lane.cars.length > 0) {
                        const next_car = search_lane.cars[0];
                        if (next_car !== this) {
                            this.last_obstacles.push(next_car);
                            obstacle = Math.min(obstacle, start_pos + next_car.position - 10);
                            found_obstacle = true;
                        }
                    }
                }
                // search cars taking other lanes into node
                const my_clearance = start_pos + search_lane.length - this.position;
                for (const [prev_node, visitor_cars] of search_node.visitors) {
                    if (prev_node !== search_lane.start_node) {
                        const gap = 10;
                        for (const other_car of visitor_cars) {
                            if (other_car !== this) {
                                const other_clearance = other_car.distance_to(search_node, prev_node);
                                // yield to other car if other car is closer to intersection.
                                // if distances are exactly the same, yield if other car has
                                // been stationary longer than I have.
                                // if this is also the same, yield based on lane priority.
                                if (
                                    other_clearance != my_clearance ?
                                    other_clearance < my_clearance : (
                                        other_car.stopped_time != this.stopped_time ? 
                                        other_car.stopped_time > this.stopped_time :
                                        search_lane.priority < prev_node.lanes_after.get(search_node).priority
                                    )
                                ) {
                                    this.last_obstacles.push(other_car);
                                    obstacle = Math.min(obstacle, start_pos + search_lane.length - gap);
                                    found_obstacle = true;
                                }
                            }
                        }
                    }
                }
                // search beginning of other lanes starting from node
                for (const other_lane of search_node.lanes_after.values()) {
                    if (other_lane.cars.length > 0) {
                        const gap = 10;
                        const other_car = other_lane.cars[0];
                        if (other_car === this) {
                            continue;
                        }
                        const p = other_car.position;
                        if (p < gap) {
                            this.last_obstacles.push(other_car);
                            obstacle = Math.min(obstacle, start_pos + search_lane.length + p - gap);
                            found_obstacle = true;
                        }
                    }
                }

                start_pos += search_lane.length;
                if (found_obstacle) {
                    break;
                }
            }
        }
        const obstacle_distance = Math.max(0, obstacle - this.position);
        // set speed such that after moving for 1 frame, my minimum stopping
        // distance will align with current target distance
        this.speed = Math.max(
            0, 
            this.speed - this.max_accel,
            Math.min(
                this.max_speed, 
                this.speed + this.max_accel,
                -this.max_accel + Math.sqrt(this.max_accel**2 + 2 * obstacle_distance * this.max_accel)
            )
        );
    }

    /**
     * Moves this car forward according to its current speed, handling
     * transitions between lanes.
     */
    move() {
        this.position += this.speed;
        this.stopped_time = this.speed == 0 ? this.stopped_time + 1 : 0;
        while (this.position > this.lane.length) {
            if (this.path.length > 1) {
                const new_lane = this.path[0].lanes_after.get(this.path[1]);

                let keep_visitor = false;
                for (let i = 1; i < this.path.length; i++) {
                    if (this.path[i - 1] === this.lane.start_node && this.path[i] === this.lane.end_node) {
                        keep_visitor = true;
                        break;
                    }
                }
                if (!keep_visitor) {
                    this.lane.end_node.visitors.get(this.lane.start_node).delete(this);
                }

                this.path.splice(0, 1);
                this.lane.cars.pop();
                new_lane.cars.splice(0, 0, this);
                this.position -= this.lane.length;
                this.lane = new_lane;

                if (this.mode == 1) {
                    this.fill_wander();
                }
            } else {
                // if no path, move onto random lane
                const new_lane = this.lane.end_node.random_lane_after();
                this.path[0] = new_lane.end_node;
                this.lane.cars.pop();
                new_lane.cars.splice(0, 0, this);
                this.position -= this.lane.length;
                this.lane = new_lane;
            }
        }
    }

    /**
     * Returns this car's current coordinates.
     * @returns {Object} object with x and y properties
     */
    get_coords() {
        return this.lane.get_coords(this.position);
    }

    /**
     * Returns the coordinates of the point on this car's planned path 
     * `distance` units ahead of it. If `distance` is greater than this
     * car's planned path length, returns null.
     * @param {*} distance 
     * @returns {Object} object with x and y properties 
     */
    get_coords_ahead(distance) {
        let d = this.lane.length - this.position;
        if (distance <= d) {
            return this.lane.get_coords(this.position + distance);
        }
        for (let i = 0; i < this.path.length - 1; i++) {
            const lane = this.path[i].lanes_after.get(this.path[i+1]);
            if (d + lane.length >= distance) {
                return lane.get_coords(distance - d);
            }
            d += lane.length;
        }
        return null;
    }

    /**
     * Draws this car to the given canvas drawing context
     * @param {CanvasDrawingContext2D} ctx 
     */
    draw(ctx) {
        const coords = this.get_coords();
        // smoothly transition from red at 0 speed to green at 2 speed 
        // to cyan at >= 10 speed
        ctx.fillStyle = color_string({
            r: Math.max(0, Math.floor(255 * (1 - this.speed / 2))),
            g: Math.min(255, Math.floor(255 * this.speed / 2)),
            b: Math.max(0, Math.min(255, Math.floor((this.speed - 2) * 32)))
        });
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }
}

/**
 * Main world object
 */
class World {
    constructor() {
        this.nodes = new Set();
        this.lanes = new Set();
        this.cars = new Set();

        // The currently selected car.
        // This will be the Car object if a car is selected, otherwise null
        this.selected = null;
    }

    /**
     * Adds a new node to this world at the given position.
     * Returns the new Node object.
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Node} new Node object
     */
    add_node(x, y) {
        const node = new Node(x, y);
        this.nodes.add(node);
        return node;
    }

    /**
     * Removes the given node from this world, including all lanes that
     * start or end at it and all cars currently on those lanes. If the
     * given node isn't present in the world, nothing happens. Returns
     * `true` if the node was present, `false` otherwise.
     * @param {Node} node 
     * @returns {Boolean}
     */
    remove_node(node) {
        for (const lane of node.lanes_after.values()) {
            this.remove_lane(lane);
        }
        for (const lane of node.lanes_before.values()) {
            this.remove_lane(lane);
        }
        return this.nodes.delete(node);
    }

    /**
     * Adds a new straight lane to this world from `start_node` to `end_node`.
     * Returns the new StraightLane object.
     * @param {Node} start_node 
     * @param {Node} end_node 
     * @returns {StraightLane}
     */
    add_straight_lane(start_node, end_node) {
        const lane = new StraightLane(start_node, end_node);
        this.lanes.add(lane);
        return lane;
    }

    /**
     * Adds a new arc lane to this world from `start_node` to `end_node` and
     * the given parameters.
     * Returns the new ArcLane object.
     * @param {Node} start_node 
     * @param {Node} end_node
     * @param {Number} center_x x coordinate of center of curvature
     * @param {Number} center_y y coordinate of center of curvature
     * @param {Boolean} counterclockwise whether arc should go counterclockwise
     * @returns {ArcLane}
     */
    add_arc_lane(start_node, end_node, center_x, center_y, counterclockwise=false) {
        const lane = new ArcLane(start_node, end_node, center_x, center_y, counterclockwise);
        this.lanes.add(lane);
        return lane;
    }

    /**
     * Removes the given lane from this world, including all cars currently 
     * on it. If the given lane isn't present in the world, nothing happens.
     * Returns `true` if the lane was present, `false` otherwise.
     * @param {Lane} lane 
     * @returns {Boolean}
     */
    remove_lane(lane) {
        while (lane.cars.length > 0) {
            this.remove_car(lane.cars[0]);
        }
        lane.start_node.lanes_after.delete(lane.end_node);
        lane.end_node.lanes_before.delete(lane.start_node);
        return this.lanes.delete(lane);
    }

    /**
     * Adds a new car to this world on the lane `lane` at position `position`.
     * Can take additional arguments for the Car constructor. Returns the new
     * Car object.
     * @param {Lane} lane 
     * @param {Number} position 
     * @param  {...any} args arguments for Car constructor 
     * @returns {Car}
     */
    add_car(lane, position, ...args) {
        const car = lane.add_new_car(position, ...args);
        this.cars.add(car);
        return car;
    }

    /**
     * Adds a new car to this world at a randomly chosen position on a 
     * randomly chosen lane. Can take addition arguments for the Car
     * constructor. Returns the new Car object.
     * @param  {...any} args arguments for Car constructor 
     * @returns {Car}
     */
    add_car_random(...args) {
        if (this.lanes.size > 0) {
            const i = Math.floor(Math.random() * this.lanes.size);
            let j = 0;
            for (const lane of this.lanes) {
                if (i == j) {
                    return this.add_car(lane, Math.random() * lane.length, ...args);
                }
                j++;
            }
        }
        return null;
    }

    /**
     * Removes the given car from this world. If the given car isn't 
     * present in the world, nothing happens. Returns `true` if the car 
     * was present, `false` otherwise.
     * @param {Car} car
     * @returns {Boolean} 
     */
    remove_car(car) {
        if (car === this.selected) {
            this.deselect();
        }
        let prev_node = car.lane.start_node;
        for (const node of car.path) {
            node.visitors.get(prev_node).delete(car);
            prev_node = node;
        }
        car.lane.cars.splice(car.lane.get_index(car.position), 1);
        return this.cars.delete(car);
    }

    /**
     * Removes all nodes, lanes, and cars from this world.
     */
    reset() {
        for (const node of this.nodes) {
            this.remove_node(node);
        }
    }

    /**
     * Adds a square grid of roads to this world with rounded upper left
     * and bottom right corners. 
     * @param {Number} x0 top left x coordinate
     * @param {Number} y0 top left y coordinate
     * @param {Number} width
     * @param {Number} height
     * @param {Number} rows
     * @param {Number} columns
     */
    add_grid(x0, y0, width, height, rows, columns) {
        // make nodes
        const nodes = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < columns; j++) {
                row.push(this.add_node(
                    x0 + j * width / (columns - 1),
                    y0 + i * height / (rows - 1)
                ));
            }
            nodes.push(row);
        }
        // add horizontal lanes
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns - 1; j++) {
                if (i % 2 == 0) {
                    this.add_straight_lane(nodes[i][j], nodes[i][j + 1]);
                } else {
                    this.add_straight_lane(nodes[i][j + 1], nodes[i][j]);
                }
            }
        }
        // add vertical lanes
        for (let j = 0; j < columns; j++) {
            for (let i = 0; i < rows - 1; i++) {
                if (j % 2 == 1) {
                    this.add_straight_lane(nodes[i][j], nodes[i + 1][j]);
                } else {
                    this.add_straight_lane(nodes[i + 1][j], nodes[i][j]);
                }
            } 
        }
        // replace corners with arcs
        this.remove_node(nodes[0][0]);
        this.add_arc_lane(
            nodes[1][0], nodes[0][1], 
            nodes[1][1].x, nodes[1][1].y
        );
        this.remove_node(nodes[rows-1][columns-1]);
        this.add_arc_lane(
            nodes[rows-2][columns-1], nodes[rows-1][columns-2], 
            nodes[rows-2][columns-2].x, nodes[rows-2][columns - 2].y
        );
    }

    /**
     * Adds a triangular grid of roads to this world.
     * @param {Number} x0 apex x coordinate
     * @param {Number} y0 apex y coordinate
     * @param {Number} height 
     * @param {Number} rows 
     */
    add_tri_grid(x0, y0, height, rows) {
        const nodes = [];
        const d = height / (rows - 1) / Math.sqrt(3);
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j <= i; j++) {
                row.push(this.add_node(
                    x0 - height / Math.sqrt(3) + d * (2 * j + rows - i - 1),
                    y0 + i * height / (rows - 1)
                ));
            }
            nodes.push(row);
        }
        // add horizontal lanes
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < i; j++) {
                if (i % 2 == 0) {
                    this.add_straight_lane(nodes[i][j], nodes[i][j + 1]);
                } else {
                    this.add_straight_lane(nodes[i][j + 1], nodes[i][j]);
                }
            }
        }
        // add lanes between left edge and bottom edge
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < i; j++) {
                if (i % 2 == 1) {
                    this.add_straight_lane(nodes[rows - i - 1 + j][j], nodes[rows - i + j][j + 1]);
                } else {
                    this.add_straight_lane(nodes[rows - i + j][j + 1], nodes[rows - i - 1 + j][j]);
                }
            }
        }
        // add lanes between right edge and bottom edge
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < i; j++) {
                if (i % 2 == 0) {
                    this.add_straight_lane(nodes[rows - i - 1 + j][rows - i - 1], nodes[rows - i + j][rows - i - 1]);
                } else {
                    this.add_straight_lane(nodes[rows - i + j][rows - i - 1], nodes[rows - i - 1 + j][rows - i - 1]);
                }
            }
        }
    }

    /**
     * Adds a circular road with evenly spaced connections to a singular central point.
     * @param {Number} x0 center x coordinate
     * @param {Number} y0 center y coordinate
     * @param {Number} radius 
     * @param {Number} spokes number of connections to the central point
     */
    add_wheel_grid(x0, y0, radius, spokes) {
        const center = this.add_node(x0, y0);
        const nodes = [];
        for (let i = 0; i < spokes; i++) {
            nodes.push(this.add_node(
                x0 + radius * Math.cos(2 * Math.PI * i / spokes),
                y0 + radius * Math.sin(2 * Math.PI * i / spokes)
            ));
        }
        for (let i = 0; i < spokes; i++) {
            if (i % 2 == 0) {
                this.add_straight_lane(center, nodes[i]);
            } else {
                this.add_straight_lane(nodes[i], center);
            }
            this.add_arc_lane(nodes[i], nodes[(i+1) % spokes], x0, y0);
        }
    }

    /**
     * Selects the car closest to the given coordinates. If no cars have
     * a squared distance less than `max_d2`, deselects the currently 
     * selected car instead. 
     * @param {Number} x 
     * @param {Number} y
     * @param {Number} max_d2 
     */
    select_closest(x, y, max_d2=900) {
        let closest = null;
        let best_d2 = Infinity;
        for (const car of this.cars) {
            const coords = car.get_coords();
            const d2 = (coords.x - x)**2 + (coords.y - y)**2;
            if (d2 < best_d2) {
                best_d2 = d2;
                closest = car;
            }
        }
        if (best_d2 < max_d2) {
            this.select(closest);
        } else {
            this.deselect();
        }
    }

    /**
     * Selects the given car
     * @param {Car} car 
     */
    select(car) {
        this.selected = car;
    }

    /**
     * Deselects the currently selected car. If no car is selected, does nothing.
     */
    deselect() {
        this.selected = null;
    }

    /**
     * Runs one simulation step for all cars in this world.
     */
    step() {
        for (const car of this.cars) {
            car.update_speed();
        }
        for (const car of this.cars) {
            car.move();
        }
    }

    unstuck() {
        for (const lane of this.lanes) {
            lane.cars.sort((a, b) => a.position - b.position);
        }
    }

    /**
     * Returns the current average speed among all cars in this world. If there
     * are no cars, returns 0.0.
     * @returns {Number}
     */
    get_average_speed() {
        if (this.cars.size == 0) {
            return 0.0;
        }
        let s = 0;
        for (const car of this.cars) {
            s += car.speed;
        }
        return s / this.cars.size;
    }

    /**
     * Draws this world to the given canvas drawing context.
     * @param {CanvasDrawingContext2D} ctx 
     */
    draw(ctx) {
        // draw lanes
        for (const lane of this.lanes) {
            lane.draw(ctx);
        }
        // draw cars
        for (const car of this.cars) {
            car.draw(ctx);
        }
        // draw additional info for selected car
        if (this.selected !== null) {
            const car = this.selected;
            // draw circle around selected car
            const coords = car.get_coords();
            ctx.beginPath();
            ctx.strokeStyle = "black";
            ctx.arc(coords.x, coords.y, 10, 0, 2 * Math.PI);
            ctx.stroke();

            // write selected car's position and speed
            ctx.fillStyle = "black";
            ctx.font = "16px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`Position: ${car.position.toFixed(2)}`, 0, 480);
            ctx.fillText(`Speed: ${car.speed.toFixed(2)} / ${car.max_speed.toFixed(2)}`, 0, 500);

            // draw spedometer
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(250, 495, 22, -Math.PI, 0);
            ctx.moveTo(250, 495);
            ctx.lineTo(
                250 - 20 * Math.cos(Math.PI * car.speed / car.max_speed),
                495 - 20 * Math.sin(Math.PI * car.speed / car.max_speed)
            );
            ctx.stroke();

            // highlight lanes on selected car's path
            for (const lane of car.path_lanes()) {
                lane.draw(ctx, "green", 4);
            }
            // draw circles around detected obstacles
            for (const obstacle_car of car.last_obstacles) {
                const obstacle_coords = obstacle_car.get_coords();
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(obstacle_coords.x, obstacle_coords.y, 8, 0, 2 * Math.PI);
                ctx.stroke();
            }
            // draw X at selected car's stopping distance
            const target = car.get_coords_ahead(car.stopping_distance());
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(target.x - 5, target.y - 5);
            ctx.lineTo(target.x + 5, target.y + 5);
            ctx.moveTo(target.x - 5, target.y + 5);
            ctx.lineTo(target.x + 5, target.y - 5);
            ctx.stroke();
        }
        // write total path segment count
        let s = 0;
        for (const car of this.cars) {
            s += car.path.length;
        }
        ctx.fillStyle = "black";
        ctx.font = "16px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Total path segments: ${s}`, 500, 500);
        ctx.fillText(`Average speed: ${this.get_average_speed().toFixed(2)}`, 500, 480);
    }
}

// create the world object
const world = new World();

// set up click and drag and touchscreen controls
const active_pointers = new Map();
function get_secondary_pointer(primary_pointer_id) {
    for (const [pointer_id, pointer_props] of active_pointers.entries()) {
        if (pointer_id != primary_pointer_id && pointer_props.down) {
            return pointer_props;
        }
    }
    return null;
}

canvas.addEventListener("pointerdown", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const x = e.clientX - canvas_bounds.left;
    const y = e.clientY - canvas_bounds.top;

    if (active_pointers.has(e.pointerId)) {
        const props = active_pointers.get(e.pointerId);
        props.x = x;
        props.y = y;
        props.down = true;
    } else {
        active_pointers.set(e.pointerId, {
            x: x,
            y: y,
            down: true
        });
    }
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const x = e.clientX - canvas_bounds.left;
    const y = e.clientY - canvas_bounds.top;
    world.select_closest(x, y);
    ctx.clearRect(0, 0, 500, 500);
    world.draw(ctx);
    canvas.releasePointerCapture(e.pointerId);
    active_pointers.delete(e.pointerId);
});
canvas.addEventListener("pointercancel", function (e) {
    canvas.releasePointerCapture(e.pointerId);
    active_pointers.delete(e.pointerId);
});

canvas.addEventListener("pointermove", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const new_x = e.clientX - canvas_bounds.left;
    const new_y = e.clientY - canvas_bounds.top;
    if (active_pointers.has(e.pointerId)) {
        const pointer_props = active_pointers.get(e.pointerId);
        const old_x = pointer_props.x;
        const old_y = pointer_props.y;
        pointer_props.x = new_x;
        pointer_props.y = new_y;
    } else {
        // new hovering pointer
        active_pointers.set(e.pointerId, {
            x: new_x,
            y: new_y,
            down: false
        });
    }
});

// set up play/pause button
let playing = true;
const playpause = elem("playpause");
playpause.addEventListener("click", function (e) {
    playing = !playing;
    if (playing) {
        playpause.innerHTML = "Pause";
    } else {
        playpause.innerHTML = "Play";
    }
});

// set up step button
let frame = 0;
elem("step").addEventListener("click", function (e) {
    if (!playing) {
        ctx.clearRect(0, 0, 500, 500);
        world.step();
        world.draw(ctx);
        frame += 1;
    }
});

// set up controls for road settings
const square_settings = elem("square_grid_settings");
const triangular_settings = elem("triangular_grid_settings");
const wheel_settings = elem("wheel_grid_settings");
const grid_selector = elem("grid_selector");
function set_grid_settings_visibility(value) {
    switch (value) {
        case "square":
            square_settings.style.display = "";
            triangular_settings.style.display = "none";
            wheel_settings.style.display = "none";
            break;
        case "triangular":
            square_settings.style.display = "none";
            triangular_settings.style.display = "";
            wheel_settings.style.display = "none";
            break;
        case "wheel":
            square_settings.style.display = "none";
            triangular_settings.style.display = "none";
            wheel_settings.style.display = "";
        default:
            break;
    }
}
set_grid_settings_visibility(grid_selector.value);
grid_selector.addEventListener("change", e => set_grid_settings_visibility(e.target.value));

function link_slider_label(slider, label_id, string_func=(v => v)) {
    const label = elem(label_id);
    slider.addEventListener("input", e => {
        label.innerText = string_func(e.target.value);
    });
}

const square_rows_slider = elem("square_rows_slider");
link_slider_label(
    square_rows_slider, 
    "square_rows_label", 
    v => 2 * v
);
const triangular_rows_slider = elem("triangular_rows_slider");
link_slider_label(
    triangular_rows_slider, 
    "triangular_rows_label"
);
const wheel_spokes_slider = elem("wheel_spokes_slider");
link_slider_label(
    wheel_spokes_slider,
    "wheel_spokes_label"
);

// set up controls for car settings
const car_num_slider = elem("car_num_slider");
link_slider_label(car_num_slider, "car_num_label");
const car_max_speed_slider = elem("car_max_speed_slider");
link_slider_label(
    car_max_speed_slider, 
    "car_max_speed_label", 
    v => (v / 10).toFixed(1)
);
const car_max_accel_slider = elem("car_max_accel_slider");
link_slider_label(
    car_max_accel_slider,
    "car_max_accel_label",
    v => (v / 100).toFixed(2)
);

// set up reset button
function reset_press() {
    world.reset();
    switch (grid_selector.value) {
        case "square":
            const s_rows = 2 * parseInt(square_rows_slider.value);
            world.add_grid(50, 50, 400, 400, s_rows, s_rows);
            break;
        case "triangular":
            const t_rows = parseInt(triangular_rows_slider.value);
            world.add_tri_grid(250, 50, 400, t_rows);
            break;
        case "wheel":
            const spokes = parseInt(wheel_spokes_slider.value);
            world.add_wheel_grid(250, 250, 200, spokes);
            break;
        default:
            return;
    }
    const car_num = car_num_slider.value;
    const max_speed = car_max_speed_slider.value / 10;
    const max_accel = car_max_accel_slider.value / 100;
    for (let i = 0; i < car_num; i++) {
        world.add_car_random(max_speed, max_accel);
    }

    ctx.clearRect(0, 0, 500, 500);
    world.draw(ctx);
}

elem("reset").addEventListener("click", reset_press);
reset_press();

function animate() {
    if (playing) {
        frame++;
        world.step();
        ctx.clearRect(0, 0, 500, 500);
        world.draw(ctx);
    }

    requestAnimationFrame(animate);
}

animate();