import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import FrontPage from './FrontPage';
import Sidebar from './Sidebar';
import StagedImages from './StagedImages';
import Upload from './Upload';

export default class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <Route component={Sidebar} />
          <Route exact path='/' component={FrontPage} />
          <Route exact path='/admin/upload' component={Upload} />
          <Route exact path='/admin/staged' component={StagedImages} />
        </div>
      </Router>
    )
  }
}
