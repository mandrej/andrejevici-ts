// import { Notify } from "quasar";
import type { QNotifyOptions } from 'quasar'
export default function notify(options: QNotifyOptions) {
  console.log('notify', options)
}

// export default function notify(options) {
//   /**
//    * type: 'positive', 'negative', 'warning', 'info', 'ongoing', 'external'
//    */
//   // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
//   let {
//     type = "info",
//     message = "no message",
//     multiLine = false,
//     timeout = 5000,
//     spinner = false,
//     group = false,
//     html = false,
//     position = "bottom",
//     actions = [],
//     caption,
//     icon = "camera",
//   } = options;
//   const color = (type) =>
//     ["info", "warning", "positive"].indexOf(type) >= 0 ? "dark" : "white";
//   actions.forEach((element) => {
//     element.color = color(type);
//   });
//   Notify.create({
//     type: type,
//     textColor: color(type),
//     message: message,
//     multiLine,
//     timeout,
//     spinner,
//     group,
//     html,
//     position,
//     actions,
//     caption,
//     icon,
//   });
// }
