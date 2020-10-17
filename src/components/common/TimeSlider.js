import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Slider from "@material-ui/core/Slider";

const defaultMarks = [
  {
    value: 10,
    label: "10m",
  },
  {
    value: 30,
    label: "30m",
  },
  {
    value: 60,
    label: "1h",
  },
  {
    value: 120,
    label: "2h",
  },
];

export default function TimeSlider({ label, marks, unit = "m" }) {
  marks = marks || defaultMarks;
  function valuetext(value, x, unit = "") {
    return `${value} ${unit}`;
  }

  function valueLabelFormat(value) {
    return marks.findIndex((mark) => mark.value === value) + 1;
  }
  return (
    <div>
      <Typography id='discrete-slider-restrict' gutterBottom>
        {label}
      </Typography>
      <Slider
        defaultValue={20}
        valueLabelFormat={valuetext}
        getAriaValueText={valuetext}
        aria-labelledby='discrete-slider-restrict'
        max={120}
        step={null}
        valueLabelDisplay='on'
        marks={marks}
      />
    </div>
  );
}
