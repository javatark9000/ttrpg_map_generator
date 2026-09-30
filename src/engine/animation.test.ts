import { describe, expect, it } from 'vitest';
import { GifReader } from 'omggif';
import { FRAME_COUNT, FRAME_MS, LOOP_MS, MAX_GIF_PIXELS, MAX_GIF_SIDE, gifDimensions, lightPulse, loopPhase } from './animation-settings';
import { createGifEncoder } from './gif-encoder';

describe('periodic motion and export bounds', () => {
  it('uses exactly 24 frames for a 2.4-second loop without duplicating the closing frame', () => {
    expect(FRAME_COUNT).toBe(24); expect(FRAME_COUNT * FRAME_MS).toBe(LOOP_MS);
    for (const time of [0,100,731,2300]) {
      expect(loopPhase(time+LOOP_MS)).toBeCloseTo(loopPhase(time));
      expect(lightPulse(loopPhase(time), .71)).toBeCloseTo(lightPulse(loopPhase(time+LOOP_MS), .71));
    }
    expect(loopPhase(-100)).toBeCloseTo(loopPhase(2300));
    expect(Math.abs(lightPulse(loopPhase(LOOP_MS-.001),1)-lightPulse(0,1))).toBeLessThan(.0001);
  });
  it('caps pixel budget and long side while preserving dimensions and integer tiles', () => {
    for (const [w,h] of [[8,8],[8,120],[120,8],[40,30],[80,80],[120,53]]) for(const requested of [25,50,100,150]) {
      const result=gifDimensions(w,h,requested);
      expect(result.tile).toBeGreaterThanOrEqual(1);expect(result.tile).toBeLessThanOrEqual(requested);
      expect(result.width*result.height).toBeLessThanOrEqual(MAX_GIF_PIXELS);
      expect(Math.max(result.width,result.height)).toBeLessThanOrEqual(MAX_GIF_SIDE);
      expect(result.width/result.height).toBeCloseTo(w/h);
    }
    expect(gifDimensions(40,30,100)).toEqual({tile:28,width:1120,height:840,reduced:true});
    expect(gifDimensions(8,8,25).reduced).toBe(false);
    expect(()=>gifDimensions(0,8,50)).toThrow(); expect(()=>gifDimensions(8,8,NaN)).toThrow();
  });
});

describe('real GIF encoding', () => {
  it('decodes with an infinite loop, exact durations, changing frames and stable colors', () => {
    const encoder=createGifEncoder(16,16);
    for(let frame=0;frame<FRAME_COUNT;frame++) {
      const data=new Uint8Array(16*16*4);
      for(let i=0;i<256;i++) data.set(i%16 === frame%16 ? [255,181,50,255]:[40,100,90,255],i*4);
      encoder.add(data);
    }
    const bytes=encoder.finish();expect(new TextDecoder().decode(bytes.slice(0,6))).toBe('GIF89a');
    const gif=new GifReader(bytes);
    expect(gif.numFrames()).toBe(FRAME_COUNT);expect(gif.loopCount()).toBe(0);
    expect(gif.width).toBe(16);expect(gif.height).toBe(16);
    for(let frame=0;frame<FRAME_COUNT;frame++)expect(gif.frameInfo(frame).delay*10).toBe(FRAME_MS);
    const first=new Uint8Array(1024), second=new Uint8Array(1024);
    gif.decodeAndBlitFrameRGBA(0,first);second.set(first);gif.decodeAndBlitFrameRGBA(1,second);
    expect(second).not.toEqual(first);expect(first.slice(8,12)).toEqual(second.slice(8,12));
    // Decode deltas cumulatively, ensuring old bright pixels are actually restored.
    const composed=new Uint8Array(1024);
    for(let frame=0;frame<FRAME_COUNT;frame++) {
      gif.decodeAndBlitFrameRGBA(frame,composed);
      for(let x=0;x<16;x++)expect([...composed.slice(x*4,x*4+4)]).toEqual(x===frame%16?[255,181,50,255]:[40,100,90,255]);
    }
  });
  it('rejects oversize dimensions, invalid frame sizes and incomplete exports', () => {
    expect(()=>createGifEncoder(1601,8)).toThrow();expect(()=>createGifEncoder(1200,1200)).toThrow();
    const encoder=createGifEncoder(8,8);
    expect(()=>encoder.add(new Uint8Array(4))).toThrow();expect(()=>encoder.finish()).toThrow();
  });
});
