import { Sector, Occupation, Module } from './src/modules/academics/academic.model.js';
import { Student } from './src/modules/students/student.model.js';
// const sector = await Sector.findAll({
//     include: {
//         model: Occupation,
//         as:"occupations"
//     }
// });
// console.log("Sector  has many occupation",JSON.stringify(sector,null,4));

// const occupation = await Occupation.findAll({
//     include: {
//         model: Sector,
//         as:"sector"
//     }
// });
 
// console.log("Occupation belongs to sector",occupation);
 
    const student = await Student.findByPk("19");
    if (!student) throw new Error('Student not found');
  
console.log("studentn",student)