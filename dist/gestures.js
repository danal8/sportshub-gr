export function swipeDirection(start,end){const dx=end.x-start.x,dy=end.y-start.y;return Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;}
