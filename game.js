// KLR Game: endless runner. One tap = wheelie (double points), a second tap
// within DOUBLE_TAP_MS = jump over the traffic cones. A wheelie through a
// puddle scores PUDDLE_POINTS. A police car chases from behind.
(function () {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    const H = 260;              // logical height; width follows the canvas aspect
    const GROUND = 215;         // y of the road surface
    const WHEEL_R = 17;
    const WHEELBASE = 62;
    const BIKE_X = 150;         // rear axle x
    const MIN_W = 560;          // narrower screens zoom out so cones show up early enough
    const COP_LEN = 100;
    const PUDDLE_POINTS = 250;
    const GRAVITY = 1900;
    const JUMP_V = 640;
    const DOUBLE_TAP_MS = 350;
    const WHEELIE_MS = 750;
    const START_SPEED = 300;
    const MAX_SPEED = 760;
    const BEST_KEY = 'klrGameBest';

    const C = {
        blue: '#1f6fe0', blueDark: '#0a2a5c', green: '#5fd13a', white: '#f2f5fa',
        dark: '#151b26', text: '#e9eef6', cone: '#ff7a1a'
    };

    let W = 600, scale = 1, offsetY = 0;
    let state = 'ready';        // ready | running | over
    let speed, distance, score, best, cones, nextCone, lastTap, wheelieStart, y, vy, wheelSpin, overAt;
    let puddles, nextPuddle, drops, popups;

    best = readBest();
    reset();

    function reset() {
        speed = START_SPEED;
        distance = 0;
        score = 0;
        cones = [];
        nextCone = 500;
        lastTap = -Infinity;
        wheelieStart = -Infinity;
        y = 0;                  // height above the road
        vy = 0;
        wheelSpin = 0;
        puddles = [];
        nextPuddle = 900;
        drops = [];
        popups = [];
    }

    function readBest() {
        try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
    }

    function saveBest() {
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* private mode */ }
    }

    // ---- input ----------------------------------------------------------
    function tap() {
        const now = performance.now();
        if (state === 'ready') {
            state = 'running';
            lastTap = now;
            wheelieStart = now;
            return;
        }
        if (state === 'over') {
            if (now - overAt < 500) return;   // don't restart on the tap that crashed
            reset();
            state = 'running';
            return;
        }
        const onGround = y === 0;
        if (onGround && now - lastTap < DOUBLE_TAP_MS) {
            vy = JUMP_V;
            lastTap = -Infinity;
        } else if (onGround) {
            wheelieStart = now;
            lastTap = now;
        }
    }

    canvas.addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
    window.addEventListener('keydown', e => {
        if (e.target.closest && e.target.closest('input, textarea, button')) return;   // typing a name
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (!e.repeat) tap();
        }
    });

    // ---- sizing ---------------------------------------------------------
    function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        scale = Math.min(canvas.height / H, canvas.width / MIN_W);
        W = canvas.width / scale;
        offsetY = canvas.height / scale - H;   // extra sky above the scene
    }
    window.addEventListener('resize', resize);
    resize();

    // ---- game loop ------------------------------------------------------
    let last = performance.now();
    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (state === 'running') update(dt, now);
        draw(now);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function splash(amount) {
        for (let i = 0; i < amount; i++) {
            drops.push({
                x: BIKE_X - 6 + Math.random() * 12,
                y: GROUND - 2,
                vx: -60 - Math.random() * 160,
                vy: -140 - Math.random() * 260,
                life: 0.5 + Math.random() * 0.3
            });
        }
    }

    // The police car keeps a wobbly distance, then pulls up after a crash
    function copFrontX(now) {
        const chasing = BIKE_X - WHEEL_R - 22 + Math.sin(now / 420) * 7;
        if (state !== 'over') return chasing;
        const t = Math.min(1, (now - overAt) / 700);
        return chasing + (BIKE_X - WHEEL_R - 4 - chasing) * (1 - (1 - t) * (1 - t));
    }

    function wheelieAngle(now) {
        const t = now - wheelieStart;
        if (t < 0 || t > WHEELIE_MS) return 0;
        const ramp = 150;
        const k = t < ramp ? t / ramp : t > WHEELIE_MS - ramp ? (WHEELIE_MS - t) / ramp : 1;
        return 0.42 * k;        // radians, front wheel up
    }

    function update(dt, now) {
        speed = Math.min(MAX_SPEED, speed + 9 * dt);
        const dx = speed * dt;
        distance += dx;
        wheelSpin += dx / WHEEL_R;

        const wheelie = y === 0 && wheelieAngle(now) > 0.2;
        score += dx / 10 * (wheelie ? 2 : 1);

        if (y > 0 || vy > 0) {
            vy -= GRAVITY * dt;
            y = Math.max(0, y + vy * dt);
            if (y === 0) vy = 0;
        }

        const copFront = copFrontX(now);
        cones.forEach(c => {
            c.x -= dx;
            if (!c.knocked && c.x < copFront) {
                c.knocked = true;          // the police car sends it flying
                c.h = 0;
                c.kvy = 420 + Math.random() * 200;
                c.kvx = 160 + Math.random() * 120;
                c.rot = 0;
            }
            if (c.knocked) {
                c.x += c.kvx * dt;
                c.kvy -= GRAVITY * dt;
                c.h = Math.max(0, c.h + c.kvy * dt);
                c.rot += 9 * dt;
            }
        });
        cones = cones.filter(c => c.x > -60);

        puddles.forEach(p => { p.x -= dx; });
        puddles = puddles.filter(p => p.x + p.w > -20);

        nextPuddle -= dx;
        if (nextPuddle <= 0) {
            if (cones.some(c => c.x > W - speed * 0.5)) {
                nextPuddle = 80;           // room to land before the puddle
            } else {
                puddles.push({ x: W + 20, w: 60 + Math.random() * 40, scored: false });
                nextPuddle = 500 + Math.random() * 900;
            }
        }

        // Rear wheel in a puddle: splash; with the front wheel up, score it
        for (const p of puddles) {
            if (y === 0 && BIKE_X > p.x && BIKE_X < p.x + p.w) {
                splash(wheelie ? 3 : 1);
                if (wheelie && !p.scored) {
                    p.scored = true;
                    score += PUDDLE_POINTS;
                    popups.push({ x: BIKE_X + 20, y: GROUND - 90, text: `+${PUDDLE_POINTS} SPLASH!`, t0: now });
                }
            }
        }

        drops.forEach(d => {
            d.x += d.vx * dt - dx * 0.6;
            d.vy += GRAVITY * 0.6 * dt;
            d.y += d.vy * dt;
            d.life -= dt;
        });
        drops = drops.filter(d => d.life > 0 && d.y < GROUND + 10);
        popups = popups.filter(pp => now - pp.t0 < 900);

        nextCone -= dx;
        if (nextCone <= 0 && puddles.some(p => p.x + p.w > W + 20 - speed * 0.9)) {
            nextCone = 60;                 // time to finish the puddle wheelie before jumping
        } else if (nextCone <= 0) {
            const pair = speed > 420 && Math.random() < 0.3;
            cones.push({ x: W + 20 });
            if (pair) cones.push({ x: W + 20 + 30 });
            // Leave enough road between cones to land and jump again
            const minGap = speed * 0.95 + 120;
            nextCone = minGap + Math.random() * speed * 1.3;
        }

        // Collision: wheels must clear the cone tops
        const bikeLeft = BIKE_X - WHEEL_R + 6;
        const bikeRight = BIKE_X + WHEELBASE + WHEEL_R - 6;
        for (const c of cones) {
            if (c.knocked) continue;
            const hitX = c.x + 22 > bikeLeft && c.x + 4 < bikeRight;
            if (hitX && y < 30) {
                state = 'over';
                overAt = now;
                const final = Math.floor(score);
                if (final > best) { best = final; saveBest(); }
                canvas.dispatchEvent(new CustomEvent('klr-gameover', { detail: { score: final } }));
                break;
            }
        }
    }

    // ---- drawing --------------------------------------------------------
    function draw(now) {
        ctx.setTransform(scale, 0, 0, scale, 0, offsetY * scale);

        const sky = ctx.createLinearGradient(0, -offsetY, 0, GROUND);
        sky.addColorStop(0, '#2a2e34');
        sky.addColorStop(1, '#5c626a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, -offsetY, W, H + offsetY);

        drawSkyline(distance * 0.15);
        drawCity(distance * 0.35);

        // road
        ctx.fillStyle = '#20252f';
        ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = C.green;
        ctx.fillRect(0, GROUND, W, 3);
        ctx.fillStyle = 'rgba(233, 238, 246, 0.6)';
        const dash = 60;
        for (let x = -(distance % dash); x < W; x += dash) ctx.fillRect(x, GROUND + 24, 30, 4);

        puddles.forEach(drawPuddle);
        cones.forEach(drawCone);
        drawCop(copFrontX(now) - COP_LEN, now);

        const angle = y > 0 ? Math.max(-0.25, Math.min(0.3, vy / 1600)) : wheelieAngle(now);
        drawBike(BIKE_X, GROUND - WHEEL_R - y, angle, state === 'over');

        ctx.fillStyle = 'rgba(150, 200, 255, 0.85)';
        drops.forEach(d => {
            ctx.beginPath();
            ctx.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.textAlign = 'center';
        ctx.font = '400 22px "Metal Mania", Impact, fantasy';
        popups.forEach(pp => {
            const t = (now - pp.t0) / 900;
            ctx.fillStyle = `rgba(121, 184, 255, ${1 - t})`;
            ctx.fillText(pp.text, pp.x, pp.y - t * 30);
        });

        // score
        ctx.fillStyle = C.text;
        ctx.font = '700 16px "Roboto Condensed", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${String(Math.floor(score)).padStart(5, '0')}   BEST ${String(best).padStart(5, '0')}`, W - 14, 26);
        if (state === 'running' && y === 0 && wheelieAngle(now) > 0.2) {
            ctx.fillStyle = C.green;
            ctx.textAlign = 'left';
            ctx.fillText('WHEELIE x2', 14, 26);
        }

        if (state === 'ready') banner('KLR GAME', 'Tap to start · tap = wheelie · double-tap = jump · wheelie through puddles = +250');
        if (state === 'over') banner('BUSTED!', 'Οι κώνοι δεν περνιούνται με σούζα 😅 · tap to ride again');
    }

    function banner(title, sub) {
        ctx.fillStyle = 'rgba(5, 11, 24, 0.6)';
        ctx.fillRect(0, 60, W, 90);
        ctx.textAlign = 'center';
        ctx.fillStyle = C.green;
        ctx.font = '400 38px "Metal Mania", Impact, fantasy';
        ctx.fillText(title, W / 2, 102);
        ctx.fillStyle = C.text;
        ctx.font = '400 15px "Roboto Condensed", sans-serif';
        ctx.fillText(sub, W / 2, 132, W - 20);
    }

    // ---- Athens backdrop: gray silhouettes, tiled every SKYLINE_LEN -------
    const SKY_SCALE = 1.35;
    const SKYLINE_LEN = 1900 * SKY_SCALE;
    const SKY_BASE = 200;
    const FAR = '#868c94';         // lit marble against the dark gray sky
    const FAR_DETAIL = '#b4b9bf';

    function drawSkyline(offset) {
        const start = -(offset % SKYLINE_LEN);
        for (let x0 = start; x0 < W; x0 += SKYLINE_LEN) {
            landmark(x0, 20, 300, drawAcropolis);
            landmark(x0, 380, 140, drawLycabettus);
            landmark(x0, 600, 260, drawKallimarmaro);
            landmark(x0, 940, 160, drawOlympieion);
            landmark(x0, 1180, 700, drawPiraeus);
        }
    }

    // Landmarks are drawn at 1x and scaled up around their base
    function landmark(x0, at, width, draw) {
        const x = x0 + at * SKY_SCALE;
        if (x + width * SKY_SCALE < 0 || x > W) return;
        ctx.save();
        ctx.translate(x, SKY_BASE);
        ctx.scale(SKY_SCALE, SKY_SCALE);
        ctx.translate(-x, -SKY_BASE);
        draw(x);
        ctx.restore();
    }

    function drawAcropolis(x) {
        const b = SKY_BASE;
        // the rock, flat on top
        poly(FAR, [[x, b], [x + 30, b - 30], [x + 55, b - 44], [x + 230, b - 47], [x + 255, b - 32], [x + 285, b]]);
        // Parthenon: steps, columns, pediment
        const px = x + 95, top = b - 47;
        ctx.fillStyle = FAR_DETAIL;
        ctx.fillRect(px - 4, top - 4, 108, 4);
        for (let i = 0; i < 9; i++) ctx.fillRect(px + i * 12.5, top - 26, 5, 22);
        ctx.fillRect(px - 4, top - 30, 108, 4);
        poly(FAR_DETAIL, [[px - 4, top - 30], [px + 50, top - 40], [px + 104, top - 30]]);
        // Erechtheion
        ctx.fillRect(x + 215, top - 14, 22, 14);
        ctx.fillRect(x + 213, top - 17, 26, 3);
    }

    function drawLycabettus(x) {
        const b = SKY_BASE;
        poly(FAR, [[x, b], [x + 45, b - 55], [x + 64, b - 92], [x + 76, b - 92], [x + 95, b - 58], [x + 140, b]]);
        // chapel of Agios Georgios on the summit
        ctx.fillStyle = FAR_DETAIL;
        ctx.fillRect(x + 62, b - 103, 16, 11);
        poly(FAR_DETAIL, [[x + 60, b - 103], [x + 70, b - 109], [x + 80, b - 103]]);
        ctx.fillRect(x + 66, b - 116, 5, 10);
        ctx.fillRect(x + 67.5, b - 121, 2, 5);                        // cross
        ctx.fillRect(x + 65.5, b - 119, 6, 1.5);
    }

    function drawKallimarmaro(x) {
        const b = SKY_BASE;
        // marble tiers of the Panathenaic Stadium seen from the entrance
        poly(FAR, [[x, b], [x + 14, b - 34], [x + 246, b - 34], [x + 260, b]]);
        ctx.fillStyle = FAR_DETAIL;
        for (let i = 1; i <= 5; i++) ctx.fillRect(x + 14 - i * 0.5 + 2, b - 34 + i * 5.5, 228 + i, 1.2);
        // the arena opening and the entrance propylaea
        poly('#a3a8af', [[x + 70, b], [x + 82, b - 14], [x + 178, b - 14], [x + 190, b]]);
        ctx.fillStyle = FAR;
        for (let i = 0; i < 6; i++) ctx.fillRect(x + 96 + i * 14, b - 22, 4, 22);
        ctx.fillRect(x + 92, b - 25, 78, 3);
    }

    function drawOlympieion(x) {
        const b = SKY_BASE;
        ctx.fillStyle = FAR;
        ctx.fillRect(x, b - 6, 160, 6);
        // the standing Corinthian columns, in two groups
        [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => ctx.fillRect(x + 10 + i * 9, b - 66, 5, 60));
        ctx.fillRect(x + 8, b - 70, 70, 4);
        [0, 1].forEach(i => ctx.fillRect(x + 120 + i * 11, b - 66, 5, 60));
        ctx.fillRect(x + 118, b - 70, 20, 4);
    }

    function drawPiraeus(x) {
        const b = SKY_BASE;
        // the harbour water
        ctx.fillStyle = '#6b7179';
        ctx.fillRect(x, b - 4, 700, 4);
        // cruise ship
        poly(FAR, [[x + 20, b - 4], [x + 10, b - 22], [x + 230, b - 22], [x + 215, b - 4]]);
        ctx.fillStyle = FAR_DETAIL;
        ctx.fillRect(x + 40, b - 34, 160, 12);
        ctx.fillRect(x + 60, b - 44, 120, 10);
        ctx.fillRect(x + 90, b - 52, 60, 8);
        ctx.fillStyle = FAR;
        for (let i = 0; i < 14; i++) ctx.fillRect(x + 46 + i * 11, b - 30, 6, 3);   // windows
        ctx.fillRect(x + 150, b - 64, 14, 12);                                      // funnel
        // ferry with open stern ramp
        poly(FAR, [[x + 290, b - 4], [x + 280, b - 18], [x + 420, b - 18], [x + 410, b - 4]]);
        ctx.fillStyle = FAR_DETAIL;
        ctx.fillRect(x + 300, b - 28, 95, 10);
        ctx.fillRect(x + 330, b - 36, 50, 8);
        ctx.fillStyle = FAR;
        ctx.fillRect(x + 360, b - 46, 10, 10);
        // small fishing boat
        poly(FAR, [[x + 455, b - 4], [x + 448, b - 11], [x + 492, b - 11], [x + 486, b - 4]]);
        ctx.fillRect(x + 468, b - 30, 2, 19);
        // container cranes
        [540, 620].forEach(cx => {
            ctx.fillStyle = FAR;
            ctx.fillRect(x + cx, b - 70, 5, 70);
            ctx.fillRect(x + cx + 30, b - 70, 5, 70);
            ctx.fillRect(x + cx - 30, b - 74, 100, 5);
            ctx.fillRect(x + cx + 12, b - 86, 3, 12);
        });
    }

    // Near layer: Athens apartment blocks (polykatoikies) and cypress trees
    const CITY_LEN = 1300;
    const city = [];
    (function buildCity() {
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let x = 0; x < CITY_LEN;) {
            if (rnd() < 0.18) {
                city.push({ tree: true, x, h: 16 + rnd() * 12 });
                x += 14;
            } else {
                const w = 34 + rnd() * 40;
                city.push({ x, w, h: 10 + rnd() * 22, antenna: rnd() < 0.4 });
                x += w + 2 + rnd() * 10;
            }
        }
    })();

    function drawCity(offset) {
        const start = -(offset % CITY_LEN);
        for (let x0 = start; x0 < W; x0 += CITY_LEN) {
            city.forEach(c => {
                const x = x0 + c.x;
                if (x > W || x + (c.w || 14) < 0) return;
                if (c.tree) {
                    poly('#23272c', [[x, GROUND], [x + 5, GROUND - c.h], [x + 10, GROUND]]);
                    return;
                }
                ctx.fillStyle = '#353a41';
                ctx.fillRect(x, GROUND - c.h, c.w, c.h);
                ctx.fillStyle = '#2a2e34';
                for (let fy = GROUND - c.h + 8; fy < GROUND - 4; fy += 9) ctx.fillRect(x - 2, fy, c.w + 4, 2);  // balconies
                if (c.antenna) ctx.fillRect(x + c.w * 0.6, GROUND - c.h - 9, 1.5, 9);
            });
        }
    }

    function drawCone(cone) {
        if (cone.knocked) {
            ctx.save();
            ctx.translate(cone.x + 13, GROUND - 17 - cone.h);
            ctx.rotate(cone.rot);
            ctx.translate(-13, -GROUND + 17);
            drawConeShape(0);
            ctx.restore();
        } else {
            drawConeShape(cone.x);
        }
    }

    function drawPuddle(p) {
        const cx = p.x + p.w / 2;
        const water = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
        water.addColorStop(0, '#16325e');
        water.addColorStop(0.5, '#2c64b8');
        water.addColorStop(1, '#16325e');
        ctx.fillStyle = water;
        ctx.beginPath();
        ctx.ellipse(cx, GROUND + 7, p.w / 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(190, 225, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - p.w * 0.25, GROUND + 5);
        ctx.lineTo(cx + p.w * 0.1, GROUND + 5);
        ctx.stroke();
    }

    function drawConeShape(x) {
        const top = GROUND - 34;
        ctx.fillStyle = C.cone;
        ctx.beginPath();
        ctx.moveTo(x + 13, top);
        ctx.lineTo(x + 22, GROUND - 4);
        ctx.lineTo(x + 4, GROUND - 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.moveTo(x + 10, top + 10);
        ctx.lineTo(x + 16, top + 10);
        ctx.lineTo(x + 18, top + 17);
        ctx.lineTo(x + 8, top + 17);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C.cone;
        ctx.fillRect(x, GROUND - 5, 26, 5);
    }

    function drawWheel(cx, cy, r = WHEEL_R) {
        ctx.fillStyle = '#0c0f14';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c9ced6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        const spin = wheelSpin * WHEEL_R / r;
        for (let i = 0; i < 6; i++) {
            const a = spin + i * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
            ctx.stroke();
        }
    }

    // Greek police patrol car, x = rear bumper, facing right
    function drawCop(x, now) {
        const g = GROUND;
        poly(C.white, [[x, g - 12], [x + 2, g - 30], [x + 24, g - 32], [x + 34, g - 48],
            [x + 70, g - 48], [x + 84, g - 32], [x + 99, g - 28], [x + 100, g - 12]]);
        poly('#1a2b4a', [[x + 30, g - 33], [x + 37, g - 45], [x + 52, g - 45], [x + 52, g - 33]]);
        poly('#1a2b4a', [[x + 56, g - 33], [x + 56, g - 45], [x + 68, g - 45], [x + 79, g - 33]]);
        ctx.fillStyle = C.blue;
        ctx.fillRect(x + 2, g - 26, 97, 6);
        ctx.fillStyle = C.white;
        ctx.font = '700 6px "Roboto Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ΑΣΤΥΝΟΜΙΑ', x + 55, g - 21);
        ctx.fillStyle = '#ffe9a0';
        ctx.fillRect(x + 96, g - 27, 4, 4);                          // headlight
        ctx.fillStyle = '#d23';
        ctx.fillRect(x, g - 27, 3, 4);                               // tail light

        // light bar: blue and red take turns
        const blueOn = Math.floor(now / 180) % 2 === 0;
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = blueOn ? '#3d8bff' : '#ff3b3b';
        ctx.fillStyle = blueOn ? '#3d8bff' : '#33415c';
        ctx.fillRect(x + 42, g - 53, 9, 5);
        ctx.shadowColor = blueOn ? '#3d8bff' : '#ff3b3b';
        ctx.fillStyle = blueOn ? '#4a2430' : '#ff3b3b';
        ctx.fillRect(x + 52, g - 53, 9, 5);
        ctx.restore();

        drawWheel(x + 20, g - 11, 11);
        drawWheel(x + 80, g - 11, 11);
    }

    function poly(color, points) {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.fill();
    }

    function line(color, width, points) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
    }

    // Side view of the blue/white/green KLR, origin at the rear axle, rotated about it
    function drawBike(x, yAxle, angle, crashed) {
        ctx.save();
        ctx.translate(x, yAxle);
        ctx.rotate(-angle + (crashed ? 0.15 : 0));

        drawWheel(0, 0);
        drawWheel(WHEELBASE, 0);

        line('#9aa3b0', 4, [[0, 0], [26, -12]]);                     // swingarm
        line('#2a2f38', 4, [[4, -24], [-14, -30]]);                  // exhaust
        poly('#1b1f27', [[20, -24], [44, -26], [46, -8], [24, -6]]); // engine
        line('#c9ced6', 4, [[WHEELBASE, 0], [49, -42]]);             // fork
        poly(C.white, [[48, -24], [74, -26], [80, -20], [52, -18]]);  // front fender
        poly(C.white, [[-16, -30], [8, -34], [10, -28], [-12, -26]]); // rear fender
        poly(C.white, [[6, -32], [32, -36], [34, -22], [12, -20]]);   // side panel
        line(C.green, 3, [[12, -26], [32, -29]]);
        poly(C.blue, [[30, -40], [50, -43], [53, -31], [32, -28]]);   // tank
        line(C.green, 2.5, [[34, -33], [51, -36]]);
        poly(C.blueDark, [[4, -38], [36, -42], [37, -36], [5, -33]]); // seat
        poly(C.white, [[52, -48], [60, -46], [60, -30], [53, -32]]);  // number plate
        poly(C.blue, [[54, -44], [59, -43], [59, -36], [55, -37]]);
        line('#c9ced6', 2.5, [[46, -48], [40, -50]]);                // handlebar

        // rider
        line('#1b2a44', 6, [[22, -40], [36, -32], [32, -14]]);       // leg
        line('#1b2a44', 7, [[20, -40], [30, -64]]);                  // torso
        line(C.green, 4, [[30, -60], [44, -48]]);                    // arm
        ctx.fillStyle = C.blue;
        ctx.beginPath();
        ctx.arc(32, -73, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.green;
        ctx.fillRect(34, -76, 8, 4);                                 // visor

        ctx.restore();
    }

    // Test hook for automated play-testing: open game.html#debug
    if (location.hash === '#debug') {
        window.klrDebug = () => ({ state, score, speed, y, cones: cones.filter(c => !c.knocked).map(c => c.x), puddles: puddles.map(p => [p.x, p.w, p.scored]) });
    }

    // Pause cleanly when the tab is hidden
    document.addEventListener('visibilitychange', () => { last = performance.now(); });
})();
